import { prisma } from './prisma';

// ── "Commandes concernées" (précis) pour les listes d'achat / production ──────────────────
// Ne montre QUE les commandes/devis réellement rattachés (productionListItemId /
// purchaseListItemId — le lien technique écrit par le moteur de stock, cf. order-stock.ts)
// avec un besoin restant réel (quantity − resolvedQuantity > 0), triés par date de création
// réelle. Remplace l'ancienne version "large" qui affichait tout ce qui référençait le même
// produit, y compris des commandes déjà résolues ou pas encore confirmées.
//
// Badge "Bloqué" par commande : simulation FIFO. Le réservé d'une matière va, dans les faits,
// aux commandes les plus anciennes en premier (elles sont réservées avant les plus récentes) —
// donc une commande est "bloquée" dès que le cumul de ce qu'il lui faut de cette matière
// (elle + toutes les plus anciennes qu'elle) dépasse ce qui est réellement réservé.

const PARENT_SELECT = { ref: true, clientName: true, createdAt: true, client: { select: { name: true, company: true } } } as const;

export type LinkedParent = { ref: string | null; clientName: string | null; client: { name: string; company: string | null } | null };
export type LinkedOrderItem = { quantity: number; order: LinkedParent; blocked: boolean };
export type LinkedQuoteItem = { quantity: number; quote: LinkedParent; blocked: boolean };
export type Links = { orderItems: LinkedOrderItem[]; quoteItems: LinkedQuoteItem[] };

type Claim = {
  id: string; kind: 'order' | 'quote'; parent: LinkedParent; createdAt: Date; stillNeeded: number; owed: number;
};

// Pour UNE matière première : toutes les commandes/devis réellement en attente de production
// utilisant cette matière (tous produits confondus), triées FIFO, + le point de bascule
// "bloqué" (simulation cumulée contre le réservé actuel de la matière).
async function materialClaims(rawMaterialId: string): Promise<{ claims: Claim[]; blockedKeys: Set<string> }> {
  const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material) return { claims: [], blockedKeys: new Set() };

  const recipeUses = await prisma.recipeItem.findMany({ where: { rawMaterialId }, select: { productId: true, quantity: true } });
  if (recipeUses.length === 0) return { claims: [], blockedKeys: new Set() };
  const ratioByProduct = new Map(recipeUses.map((r) => [r.productId, r.quantity]));

  const lines = await prisma.productionListItem.findMany({
    where: { productId: { in: recipeUses.map((r) => r.productId) }, status: { in: ['A_PRODUIRE', 'BLOQUE'] } },
    select: { id: true, productId: true },
  });
  if (lines.length === 0) return { claims: [], blockedKeys: new Set() };
  const lineIds = lines.map((l) => l.id);
  const ratioByLineId = new Map(lines.map((l) => [l.id, ratioByProduct.get(l.productId) ?? 0]));

  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productionListItemId: { in: lineIds } },
      select: { id: true, productionListItemId: true, quantity: true, resolvedQuantity: true, order: { select: PARENT_SELECT } },
    }),
    prisma.quoteItem.findMany({
      where: { productionListItemId: { in: lineIds } },
      select: { id: true, productionListItemId: true, quantity: true, resolvedQuantity: true, quote: { select: PARENT_SELECT } },
    }),
  ]);

  const claims: Claim[] = [
    ...orderItems.map((i) => ({
      id: i.id, kind: 'order' as const, parent: i.order, createdAt: i.order.createdAt,
      stillNeeded: i.quantity - i.resolvedQuantity,
      owed: (ratioByLineId.get(i.productionListItemId!) ?? 0) * (i.quantity - i.resolvedQuantity),
    })),
    ...quoteItems.map((i) => ({
      id: i.id, kind: 'quote' as const, parent: i.quote, createdAt: i.quote.createdAt,
      stillNeeded: i.quantity - i.resolvedQuantity,
      owed: (ratioByLineId.get(i.productionListItemId!) ?? 0) * (i.quantity - i.resolvedQuantity),
    })),
  ].filter((c) => c.stillNeeded > 0).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const blockedKeys = new Set<string>();
  let cumulative = 0;
  for (const c of claims) {
    cumulative += c.owed;
    if (cumulative > material.reserved) blockedKeys.add(`${c.kind}:${c.id}`);
  }
  return { claims, blockedKeys };
}

// Un "résolveur" par requête HTTP : mémorise le résultat de materialClaims par matière pour
// ne jamais le recalculer plusieurs fois si plusieurs lignes de la liste partagent la même
// matière première (au lieu d'un balayage global, on garde juste ce qui a déjà été demandé).
export function createLinkResolver() {
  const materialCache = new Map<string, Promise<{ claims: Claim[]; blockedKeys: Set<string> }>>();
  const getMaterialClaims = (rawMaterialId: string) => {
    let cached = materialCache.get(rawMaterialId);
    if (!cached) { cached = materialClaims(rawMaterialId); materialCache.set(rawMaterialId, cached); }
    return cached;
  };

  return {
    // Ligne de production d'UN produit : ses commandes/devis réellement rattachés, bloqué
    // déterminé en croisant TOUTES les matières de la recette du produit.
    async productionLineLinks(productId: string, productionListItemId: string): Promise<Links> {
      const recipe = await prisma.recipeItem.findMany({ where: { productId }, select: { rawMaterialId: true } });
      const blockedKeys = new Set<string>();
      for (const r of recipe) {
        const { blockedKeys: keys } = await getMaterialClaims(r.rawMaterialId);
        for (const k of keys) blockedKeys.add(k);
      }

      const [orderItems, quoteItems] = await Promise.all([
        prisma.orderItem.findMany({ where: { productionListItemId }, select: { id: true, quantity: true, resolvedQuantity: true, order: { select: PARENT_SELECT } } }),
        prisma.quoteItem.findMany({ where: { productionListItemId }, select: { id: true, quantity: true, resolvedQuantity: true, quote: { select: PARENT_SELECT } } }),
      ]);

      return {
        orderItems: orderItems.filter((i) => i.quantity - i.resolvedQuantity > 0)
          .map((i) => ({ quantity: i.quantity - i.resolvedQuantity, order: i.order, blocked: blockedKeys.has(`order:${i.id}`) })),
        quoteItems: quoteItems.filter((i) => i.quantity - i.resolvedQuantity > 0)
          .map((i) => ({ quantity: i.quantity - i.resolvedQuantity, quote: i.quote, blocked: blockedKeys.has(`quote:${i.id}`) })),
      };
    },

    // Ligne d'achat MATIÈRE : directement la simulation FIFO de cette matière.
    async materialPurchaseLinks(rawMaterialId: string): Promise<Links> {
      const { claims, blockedKeys } = await getMaterialClaims(rawMaterialId);
      return {
        orderItems: claims.filter((c) => c.kind === 'order').map((c) => ({ quantity: c.stillNeeded, order: c.parent, blocked: blockedKeys.has(`order:${c.id}`) })),
        quoteItems: claims.filter((c) => c.kind === 'quote').map((c) => ({ quantity: c.stillNeeded, quote: c.parent, blocked: blockedKeys.has(`quote:${c.id}`) })),
      };
    },

    // Ligne d'achat PRODUIT (acheté) : pas de notion de "bloqué" (pas de matière première).
    async purchaseLineLinks(purchaseListItemId: string): Promise<Links> {
      const [orderItems, quoteItems] = await Promise.all([
        prisma.orderItem.findMany({ where: { purchaseListItemId }, select: { id: true, quantity: true, resolvedQuantity: true, order: { select: PARENT_SELECT } } }),
        prisma.quoteItem.findMany({ where: { purchaseListItemId }, select: { id: true, quantity: true, resolvedQuantity: true, quote: { select: PARENT_SELECT } } }),
      ]);
      return {
        orderItems: orderItems.filter((i) => i.quantity - i.resolvedQuantity > 0).map((i) => ({ quantity: i.quantity - i.resolvedQuantity, order: i.order, blocked: false })),
        quoteItems: quoteItems.filter((i) => i.quantity - i.resolvedQuantity > 0).map((i) => ({ quantity: i.quantity - i.resolvedQuantity, quote: i.quote, blocked: false })),
      };
    },
  };
}
