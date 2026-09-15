import { prisma } from './prisma';
import { fifoCompare, sortLinesByFifo } from './order-stock';

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

// clientName/clientCompany : snapshot figé au moment de la création de la commande/devis
// (cf. schema.prisma) — c'est la société POUR QUI cette commande a été passée, même si le
// client lié (`clientId`) est ensuite réassigné/modifié/fusionné. `client` (relation live)
// ne sert que de repli quand le snapshot est vide — même priorité que partout ailleurs dans
// l'app (cf. request-detail.ts:76-77), pour ne jamais afficher la société ACTUELLE du client
// lié à la place de celle pour qui la commande a réellement été prise.
const PARENT_SELECT = { ref: true, clientName: true, clientCompany: true, createdAt: true, priority: true, client: { select: { name: true, company: true } } } as const;

export type LinkedParent = { ref: string | null; clientName: string | null; clientCompany: string | null; client: { name: string; company: string | null } | null };
// `product` : uniquement pour les commandes remontées via une matière PARTAGÉE par plusieurs
// produits (cf. materialPurchaseLinks) — précise quel produit fabriqué est à l'origine de ce
// besoin de matière, pour ne jamais confondre la contribution de deux produits différents.
export type LinkedOrderItem = { quantity: number; order: LinkedParent; blocked: boolean; product?: { reference: string; name: string | null } };
export type LinkedQuoteItem = { quantity: number; quote: LinkedParent; blocked: boolean; product?: { reference: string; name: string | null } };
// Part du besoin d'une matière première qui vient du BUFFER (rattrapage préventif) d'un
// produit fabriqué en aval, PAS d'une commande client — cf. resyncMaterialPurchaseNeed.
// Affiché à part dans "Commandes concernées" ("Réassort préventif (RÉF produit)") pour ne
// jamais le confondre avec le propre buffer de la matière ("Réassort préventif (buffer)").
export type BufferSource = { productId: string; reference: string; name: string | null; quantity: number };
export type Links = { orderItems: LinkedOrderItem[]; quoteItems: LinkedQuoteItem[]; bufferSources?: BufferSource[] };

type Claim = {
  id: string; kind: 'order' | 'quote'; parent: LinkedParent; createdAt: Date; priority: boolean;
  // `stillNeeded` = manquant en unités de PRODUIT (quantity − resolvedQuantity, brut) ; sert au
  // statut "Bloqué" par commande (checkCompletion, ailleurs) et n'est jamais affiché tel quel.
  // `materialQty` = ce même manquant converti en unités de CETTE matière (× ratio de recette) —
  // jamais affiché tel quel non plus sur une carte matière (cf. `missingQty` ci-dessous) : ça
  // montrerait TOUT ce que cette commande doit, même la part déjà couverte par ce qu'il reste
  // du pool avant elle dans l'ordre FIFO.
  // `missingQty` = uniquement la part de CETTE commande qui dépasse le réservé actuel, une fois
  // les commandes plus anciennes servies en premier — calculée en différence de cumul (cf.
  // materialClaims). C'est la seule quantité honnête à afficher : le reste (materialQty −
  // missingQty) est déjà couvert, peu importe que la commande porte quand même le badge
  // "Bloqué" (dès qu'UNE partie manque, toute la commande reste bloquée tant que ce n'est pas
  // réglé — mais on n'affiche que ce qui manque VRAIMENT).
  stillNeeded: number; materialQty: number; missingQty: number; owed: number;
  product: { reference: string; name: string | null };
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
    select: { id: true, productId: true, product: { select: { reference: true, name: true } } },
  });
  if (lines.length === 0) return { claims: [], blockedKeys: new Set() };
  const lineIds = lines.map((l) => l.id);
  const ratioByLineId = new Map(lines.map((l) => [l.id, ratioByProduct.get(l.productId) ?? 0]));
  const productByLineId = new Map(lines.map((l) => [l.id, l.product]));

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
    ...orderItems.map((i) => {
      const ratio = ratioByLineId.get(i.productionListItemId!) ?? 0;
      const stillNeeded = i.quantity - i.resolvedQuantity;
      return {
        id: i.id, kind: 'order' as const, parent: i.order, createdAt: i.order.createdAt, priority: i.order.priority,
        stillNeeded, materialQty: ratio * stillNeeded, missingQty: 0, owed: ratio * stillNeeded,
        product: productByLineId.get(i.productionListItemId!)!,
      };
    }),
    ...quoteItems.map((i) => {
      const ratio = ratioByLineId.get(i.productionListItemId!) ?? 0;
      const stillNeeded = i.quantity - i.resolvedQuantity;
      return {
        id: i.id, kind: 'quote' as const, parent: i.quote, createdAt: i.quote.createdAt, priority: i.quote.priority,
        stillNeeded, materialQty: ratio * stillNeeded, missingQty: 0, owed: ratio * stillNeeded,
        product: productByLineId.get(i.productionListItemId!)!,
      };
    }),
  ].filter((c) => c.stillNeeded > 0).sort(fifoCompare);

  // Simulation FIFO cumulée : chaque commande est servie dans l'ordre (les plus anciennes
  // d'abord) par ce qui reste du réservé. `missingQty` = uniquement la part de CETTE commande
  // qui dépasse ce que le cumul peut encore couvrir (différence de cumul avant/après elle) —
  // jamais son besoin total, dont une partie peut être déjà couverte par le reliquat du pool.
  const blockedKeys = new Set<string>();
  let cumulative = 0;
  for (const c of claims) {
    const before = cumulative;
    cumulative += c.owed;
    if (cumulative > material.reserved) {
      blockedKeys.add(`${c.kind}:${c.id}`);
      c.missingQty = Math.max(0, cumulative - material.reserved) - Math.max(0, before - material.reserved);
    }
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

    // Ligne d'achat MATIÈRE : directement la simulation FIFO de cette matière, PLUS la part du
    // besoin qui vient du buffer de chaque produit fabriqué en aval (pas d'une commande — cf.
    // resyncMaterialPurchaseNeed qui cascade needed+buffer des lignes de production).
    //
    // Le "manquant" affiché par source de buffer n'est PAS la cascade brute (ratio × buffer du
    // produit) : c'est UNIQUEMENT la part qui dépasserait le coussin de sécurité de la matière
    // elle-même (available − purchaseThreshold) — le buffer produit peut "dépenser" librement
    // le surplus au-dessus du seuil de la matière, sans jamais entamer son seuil propre ; seul
    // ce qui irait EN DESSOUS de ce seuil compte comme un vrai manquant à acheter. Simulation
    // cumulée en FIFO (même clé que pour les commandes, cf. sortLinesByFifo) si plusieurs
    // produits cascadent sur la même matière — sinon on compterait deux fois le même coussin.
    async materialPurchaseLinks(rawMaterialId: string): Promise<Links> {
      const { claims, blockedKeys } = await getMaterialClaims(rawMaterialId);

      const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
      const spendableSurplus = material ? Math.max(0, material.available - material.purchaseThreshold) : 0;

      const recipeUses = await prisma.recipeItem.findMany({ where: { rawMaterialId }, select: { productId: true, quantity: true } });
      const ratioByProduct = new Map(recipeUses.map((r) => [r.productId, r.quantity]));
      const linesRaw = recipeUses.length > 0
        ? await prisma.productionListItem.findMany({
            where: { productId: { in: recipeUses.map((r) => r.productId) }, status: { in: ['A_PRODUIRE', 'BLOQUE'] }, bufferQuantity: { gt: 0 } },
            select: { id: true, createdAt: true, productId: true, bufferQuantity: true, product: { select: { reference: true, name: true } } },
          })
        : [];
      const sortedLines = await sortLinesByFifo(linesRaw);

      let cumulativeBuffer = 0;
      const bufferSources: BufferSource[] = [];
      for (const l of sortedLines) {
        const quantity = (ratioByProduct.get(l.productId) ?? 0) * l.bufferQuantity;
        if (quantity <= 0) continue;
        const before = cumulativeBuffer;
        cumulativeBuffer += quantity;
        const missing = Math.max(0, cumulativeBuffer - spendableSurplus) - Math.max(0, before - spendableSurplus);
        if (missing > 0) {
          bufferSources.push({ productId: l.productId, reference: l.product.reference, name: l.product.name, quantity: missing });
        }
      }

      // N'affiche QUE les commandes/devis réellement "Bloqués" (non couverts par le réservé
      // actuel, cf. materialClaims) — une commande couverte n'a, par définition, pas de manque
      // sur CETTE matière : ce n'est jamais elle qui justifie la présence de cette carte,
      // même si la carte existe à cause d'une autre commande/du buffer. `blocked` reste
      // toujours `true` ici puisque ne sont gardées que celles qui le sont — le champ est
      // conservé dans le type pour l'affichage (badge) et par cohérence avec productionLineLinks.
      const isBlocked = (kind: 'order' | 'quote', id: string) => blockedKeys.has(`${kind}:${id}`);
      return {
        // `missingQty` (jamais `materialQty`, le besoin matière TOTAL de la commande) : cf.
        // commentaire du type Claim — sinon on affiche tout ce que la commande doit, même la
        // part déjà couverte par le reliquat du pool avant elle dans l'ordre FIFO.
        orderItems: claims.filter((c) => c.kind === 'order' && isBlocked('order', c.id))
          .map((c) => ({ quantity: c.missingQty, order: c.parent, blocked: true, product: c.product })),
        quoteItems: claims.filter((c) => c.kind === 'quote' && isBlocked('quote', c.id))
          .map((c) => ({ quantity: c.missingQty, quote: c.parent, blocked: true, product: c.product })),
        bufferSources,
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
