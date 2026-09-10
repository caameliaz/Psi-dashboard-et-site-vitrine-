import { prisma } from './prisma';
import { notifyRollLinkOrderReady } from './rolllink-notify';

// ═══════════════════════════════════════════════════════════════════════════
// Logique de stock déclenchée par le cycle de vie des commandes/devis.
// cf. doc "Logique du Stock, de la Liste d'achats et de la Liste de production".
//
// Simplifications assumées (phase 2, à affiner si besoin réel) :
// - Pas d'étape "En livraison" automatique : le statut LIVRE décrémente
//   directement `reserved`. `inDelivery` reste disponible pour un usage manuel
//   (Correction, page Stock) si le suivi transporteur en a besoin plus tard.
// ═══════════════════════════════════════════════════════════════════════════

type Kind = 'order' | 'quote';

function itemDelegate(kind: Kind) {
  return kind === 'order' ? prisma.orderItem : prisma.quoteItem;
}
function parentDelegate(kind: Kind) {
  return kind === 'order' ? prisma.order : prisma.quote;
}
function itemWhereParent(kind: Kind, parentId: string) {
  return kind === 'order' ? { orderId: parentId } : { quoteId: parentId };
}

export const OPEN_PURCHASE_STATUSES = ['A_COMMANDER', 'COMMANDE'] as const;
export const OPEN_PRODUCTION_STATUSES = ['A_PRODUIRE', 'BLOQUE', 'EN_COURS'] as const;

// ── Comparateur FIFO commun (commandes prioritaires) ─────────────────────────────────────────
// Une commande/devis marqué "prioritaire" passe TOUJOURS avant les autres dans toutes les
// simulations FIFO (distribution, réaffectation, reprise de couverture...), comme si elle avait
// été créée en premier. Entre plusieurs prioritaires (ou plusieurs non-prioritaires), la vraie
// ancienneté décide comme d'habitude. Ne déclenche jamais rien tout seul — la priorité ne
// compte qu'au prochain évènement qui relance l'une de ces simulations.
export function fifoCompare(a: { priority: boolean; createdAt: Date }, b: { priority: boolean; createdAt: Date }): number {
  if (a.priority !== b.priority) return a.priority ? -1 : 1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

// Réserve les matières premières nécessaires pour produire `qty` unités d'un produit.
// Ce qui est disponible est déplacé de `available` vers `reserved`. Retourne le statut
// résultant de la ligne de production — le manquant éventuel en liste d'achat matière n'est
// PAS géré ici : il est recalculé à neuf par `resyncMaterialsForProduct` (cf. plus bas),
// jamais accumulé, pour ne jamais dériver au fil des cycles réserve/relâche.
export async function reserveRawMaterialsForProduction(productId: string, qty: number): Promise<'A_PRODUIRE' | 'BLOQUE'> {
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
  if (recipe.length === 0) return 'A_PRODUIRE'; // pas de recette définie — rien à réserver

  let blocked = false;
  for (const item of recipe) {
    const needed = item.quantity * qty;
    const mat = item.rawMaterial;
    const reservable = Math.min(needed, mat.available);
    if (reservable > 0) {
      await prisma.rawMaterial.update({ where: { id: mat.id }, data: { available: { decrement: reservable }, reserved: { increment: reservable } } });
    }
    if (needed - reservable > 0) blocked = true;
  }
  return blocked ? 'BLOQUE' : 'A_PRODUIRE';
}

// Symétrique de reserveRawMaterialsForProduction : relâche les matières réservées
// pour `qty` unités d'un produit (reserved → available). Le manquant éventuel en liste
// d'achat matière n'est pas géré ici (recalculé à neuf par resyncMaterialsForProduct).
export async function releaseRawMaterialsForProduction(productId: string, qty: number) {
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
  for (const r of recipe) {
    const needed = r.quantity * qty;
    const releasedFromReserved = Math.min(needed, r.rawMaterial.reserved);
    if (releasedFromReserved > 0) {
      await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { reserved: { decrement: releasedFromReserved }, available: { increment: releasedFromReserved } } }).catch(() => {});
    }
  }
}

// ── Recalcule le besoin réel + buffer d'UNE matière première entièrement à neuf (jamais
// accumulé), à partir de ce que les lignes de production ouvertes réclament réellement.
// besoin réel = Σ (recette × (besoin + buffer de chaque ligne utilisant cette matière))
//
// Deux notions de "couvert", pour ne jamais compter `available` deux fois :
// - couvertBesoin = reserved + en-transit + available : pour savoir si le BESOIN (needed+buffer
//   des lignes de prod) est déjà satisfait, TOUT ce qui est physiquement là compte — y compris
//   ce qui traîne en `available` sans être réservé (ex: le buffer, qui ne réserve jamais rien,
//   cf. resyncProductionLine). Sinon la carte réclamerait à tort d'acheter une matière déjà en
//   stock, juste parce qu'elle n'a jamais été formellement réservée.
// - couvertBuffer = reserved + en-transit SEUL (jamais `available`, déjà pris en compte dans
//   `bufferTarget` = stockMax − available) : sert uniquement à réduire le rattrapage préventif
//   PROPRE de la matière quand on a commandé plus que nécessaire (cf. section 13) — compter
//   `available` ici aussi le soustrairait deux fois du même chiffre.
// Le couvert sert D'ABORD le besoin réel, le reliquat sert ensuite le buffer — jamais
// l'inverse (même priorité que partout ailleurs dans le système).
export async function resyncMaterialPurchaseNeed(rawMaterialId: string) {
  const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material) return;

  const recipeUses = await prisma.recipeItem.findMany({ where: { rawMaterialId }, select: { productId: true, quantity: true } });
  let demand = 0;
  if (recipeUses.length > 0) {
    const ratioByProduct = new Map(recipeUses.map((r) => [r.productId, r.quantity]));
    const lines = await prisma.productionListItem.findMany({
      where: { productId: { in: recipeUses.map((r) => r.productId) }, status: { in: ['A_PRODUIRE', 'BLOQUE'] } },
    });
    for (const line of lines) {
      demand += (ratioByProduct.get(line.productId) ?? 0) * (line.neededQuantity + line.bufferQuantity);
    }
  }
  const bufferTarget = material.available < material.purchaseThreshold ? Math.max(0, material.stockMax - material.available) : 0;

  const existing = await prisma.purchaseListItem.findFirst({ where: { rawMaterialId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });
  const inTransit = existing ? Math.max(0, existing.orderedQuantity - existing.receivedQuantity) : 0;
  const coveredForNeed = material.reserved + inTransit + material.available;
  const realNeeded = Math.max(0, demand - coveredForNeed);
  const coveredForBuffer = material.reserved + inTransit;
  const leftoverCovered = Math.max(0, coveredForBuffer - demand);
  const bufferNeeded = Math.max(0, bufferTarget - leftoverCovered);

  if (existing) {
    // Seule `orderedQuantity` reste figée une fois "Commandé" — besoin réel et buffer
    // continuent de se recalculer normalement. Suppression auto uniquement si jamais commandée.
    if (realNeeded === 0 && bufferNeeded === 0 && existing.status === 'A_COMMANDER') {
      await prisma.purchaseListItem.delete({ where: { id: existing.id } }).catch(() => {});
      return;
    }
    if (existing.neededQuantity === realNeeded && existing.bufferQuantity === bufferNeeded) return;
    await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: realNeeded, bufferQuantity: bufferNeeded } }).catch(() => {});
    return;
  }
  if (realNeeded > 0 || bufferNeeded > 0) {
    await prisma.purchaseListItem.create({ data: { rawMaterialId, neededQuantity: realNeeded, bufferQuantity: bufferNeeded, auto: realNeeded === 0 } }).catch(() => {});
  }
}

// Recalcule à neuf toutes les matières premières de la recette d'un produit.
export async function resyncMaterialsForProduct(productId: string) {
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, select: { rawMaterialId: true } });
  for (const r of recipe) await resyncMaterialPurchaseNeed(r.rawMaterialId);
}

// Recalcule UNIQUEMENT le rattrapage préventif (bufferQuantity) d'une matière première,
// sans toucher au besoin réel — pour les actions de stock qui ne sont PAS pilotées par le
// moteur de commande (correction manuelle, réapprovisionnement, changement de seuil/stock max).
export async function resyncMaterialBufferOnly(rawMaterialId: string) {
  const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material) return;

  const bufferTarget = material.available < material.purchaseThreshold ? Math.max(0, material.stockMax - material.available) : 0;
  const existing = await prisma.purchaseListItem.findFirst({ where: { rawMaterialId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });

  if (existing) {
    if (existing.neededQuantity === 0 && bufferTarget === 0 && existing.status === 'A_COMMANDER') {
      await prisma.purchaseListItem.delete({ where: { id: existing.id } }).catch(() => {});
      return;
    }
    if (existing.bufferQuantity === bufferTarget) return;
    await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { bufferQuantity: bufferTarget } }).catch(() => {});
    return;
  }
  if (bufferTarget > 0) {
    await prisma.purchaseListItem.create({ data: { rawMaterialId, neededQuantity: 0, bufferQuantity: bufferTarget, auto: true } }).catch(() => {});
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Côté PRODUIT : même philosophie "entièrement dérivé, jamais accumulé" que côté
// matière première ci-dessus, appliquée un cran plus haut. `neededQuantity` sur la ligne
// de production/achat d'un produit n'est JAMAIS incrémenté/décrémenté à la main — il est
// recalculé à neuf, à chaque appel, à partir de la somme réelle (quantity − resolvedQuantity)
// des articles de commande/devis actuellement rattachés (stockPath IN_PRODUCTION/
// PURCHASE_PENDING). Contrairement à la matière première (dont `reserved` est un pot commun
// non attribuable à une commande précise), chaque article de commande porte déjà sa propre
// part détaillée (`resolvedQuantity`) — pas besoin de soustraire quoi que ce soit, juste
// additionner ce qu'il reste réellement à chacun. `bufferQuantity` garde la même formule
// que d'habitude (disponible < seuil ? stock max − disponible : 0).
// ═══════════════════════════════════════════════════════════════════════════

async function realProductionNeed(productId: string): Promise<number> {
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({ where: { productId, stockPath: 'IN_PRODUCTION' }, select: { quantity: true, resolvedQuantity: true } }),
    prisma.quoteItem.findMany({ where: { productId, stockPath: 'IN_PRODUCTION' }, select: { quantity: true, resolvedQuantity: true } }),
  ]);
  return [...orderItems, ...quoteItems].reduce((sum, i) => sum + Math.max(0, i.quantity - i.resolvedQuantity), 0);
}

async function realPurchaseNeed(productId: string): Promise<number> {
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({ where: { productId, stockPath: 'PURCHASE_PENDING' }, select: { quantity: true, resolvedQuantity: true } }),
    prisma.quoteItem.findMany({ where: { productId, stockPath: 'PURCHASE_PENDING' }, select: { quantity: true, resolvedQuantity: true } }),
  ]);
  return [...orderItems, ...quoteItems].reduce((sum, i) => sum + Math.max(0, i.quantity - i.resolvedQuantity), 0);
}

// Vérifie si la matière réservée couvre le BESOIN RÉEL seul (jamais le buffer — le buffer est
// juste un coussin de sécurité en plus, pas une commande cliente à honorer : s'il n'est pas
// entièrement couvert, ça ne doit jamais faire passer la ligne à "Bloqué"). Vérification
// directe à chaque appel — jamais déduite de "qu'est-ce qui a été tenté cette fois", pour ne
// pas rester bloqué sur un vieux statut périmé (ex: le buffer bouge mais l'ancien manquant sur
// le besoin réel, lui, n'a jamais été revérifié).
async function isProductionBlocked(productId: string, realNeeded: number): Promise<boolean> {
  if (realNeeded <= 0) return false;
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
  return recipe.some((r) => r.rawMaterial.reserved < r.quantity * realNeeded);
}

// Recalcule entièrement à neuf la ligne de production d'UN produit fabriqué (besoin réel +
// buffer), et renvoie la ligne résultante (ou null si elle a été supprimée / n'existe pas).
// À appeler après CHAQUE action qui change soit les commandes de ce produit, soit son disponible.
//
// ⚠️ Matière première — asymétrie volontaire entre le besoin réel et le buffer :
// - Le BUFFER réserve/relâche automatiquement de la matière dans les DEUX sens ici (personne
//   d'autre ne le gère, aucune ambiguïté possible sur sa raison d'être).
// - Le BESOIN RÉEL ne fait QUE réserver automatiquement à la hausse ici (une nouvelle demande
//   ne peut venir que d'une vraie commande, sans ambiguïté). Il ne relâche JAMAIS automatiquement
//   à la baisse : une baisse peut venir d'une annulation (il faut relâcher) OU d'une production
//   réelle (la matière est déjà consommée, il ne faut RIEN relâcher) — resync ne peut pas deviner
//   laquelle. C'est à l'appelant de relâcher explicitement AVANT d'appeler cette fonction s'il
//   s'agit d'une annulation/réduction (cf. releaseOrderItemStock, adjustOrderItemQuantity) ;
//   s'il s'agit d'une production, la matière a déjà été consommée directement par la route
//   "Marquer fabriquée", qui n'appelle jamais de relâchement pour cette part.
export async function resyncProductionLine(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !(product.mode === 'FABRIQUE' || product.mode === 'LES_DEUX')) return null;

  const realNeeded = await realProductionNeed(productId);
  const target = product.available < product.productionThreshold ? Math.max(0, product.stockMax - product.available) : 0;
  const existing = await prisma.productionListItem.findFirst({ where: { productId, status: { in: ['A_PRODUIRE', 'BLOQUE'] } } });

  try {
    if (existing) {
      const deltaNeeded = realNeeded - existing.neededQuantity;
      const deltaBuffer = target - existing.bufferQuantity;
      if (deltaNeeded === 0 && deltaBuffer === 0) return existing;

      if (deltaNeeded > 0) await reserveRawMaterialsForProduction(productId, deltaNeeded);
      // deltaNeeded < 0 : jamais de relâchement automatique ici (cf. commentaire ci-dessus).
      // Le BUFFER ne réserve/relâche plus JAMAIS de matière (décision produit) : c'est un
      // simple chiffre indicatif de rattrapage préventif, pas un engagement physique — la
      // matière ne se met de côté que pour du besoin réel. Le buffer continue quand même à
      // faire remonter un manquant en liste d'achat matière (cf. resyncMaterialPurchaseNeed,
      // inchangée), simplement sans jamais rien réserver derrière.

      // Statut revérifié à neuf à chaque appel, sur le besoin réel SEUL (jamais déduit de ce
      // qui a été tenté ci-dessus) — sinon un vieux manquant qui n'a rien à voir avec ce qui
      // vient de changer (ex: le buffer) resterait masqué derrière un statut périmé.
      const blockedByDelta = await isProductionBlocked(productId, realNeeded);

      if (realNeeded === 0 && target === 0) {
        // Une ligne qui a réellement produit quelque chose garde une trace (statut "Produit",
        // conservée pour l'historique) ; une ligne jamais touchée par une production réelle
        // (pur buffer annulé, ou besoin annulé avant toute fabrication) disparaît simplement.
        if (existing.producedQuantity > 0) {
          return await prisma.productionListItem.update({ where: { id: existing.id }, data: { neededQuantity: 0, bufferQuantity: 0, status: 'PRODUIT' } });
        }
        await prisma.productionListItem.delete({ where: { id: existing.id } });
        return null;
      }

      return await prisma.productionListItem.update({
        where: { id: existing.id },
        data: { neededQuantity: realNeeded, bufferQuantity: target, status: blockedByDelta ? 'BLOQUE' : 'A_PRODUIRE' },
      });
    }

    if (realNeeded > 0 || target > 0) {
      if (realNeeded > 0) await reserveRawMaterialsForProduction(productId, realNeeded);
      // target (buffer) : jamais réservé, cf. commentaire plus haut.
      const blocked = await isProductionBlocked(productId, realNeeded);
      return await prisma.productionListItem.create({
        data: { productId, neededQuantity: realNeeded, bufferQuantity: target, status: blocked ? 'BLOQUE' : 'A_PRODUIRE', auto: realNeeded === 0 },
      });
    }
    return null;
  } finally {
    await resyncMaterialsForProduct(productId);
  }
}

// Équivalent achat de resyncProductionLine, pour un produit "Acheté"/"Les deux" — pas de
// matière première ici, donc pas de réservation/statut Bloqué à gérer. Ce qui est déjà
// commandé au fournisseur mais pas encore reçu (en-transit) compte comme déjà sécurisé —
// sert d'abord le besoin réel, le reliquat sert ensuite le buffer (même logique que
// resyncMaterialPurchaseNeed).
export async function resyncPurchaseLineForProduct(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !(product.mode === 'ACHETE' || product.mode === 'LES_DEUX')) return null;

  const demand = await realPurchaseNeed(productId);
  const target = product.available < product.purchaseThreshold ? Math.max(0, product.stockMax - product.available) : 0;
  const existing = await prisma.purchaseListItem.findFirst({ where: { productId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });
  const inTransit = existing ? Math.max(0, existing.orderedQuantity - existing.receivedQuantity) : 0;
  const realNeeded = Math.max(0, demand - inTransit);
  const leftoverCovered = Math.max(0, inTransit - demand);
  const bufferNeeded = Math.max(0, target - leftoverCovered);

  if (existing) {
    // Suppression automatique uniquement si jamais commandée — une fois "Commandé", la carte
    // reste ouverte jusqu'à réception complète, même si besoin+buffer retombent à 0.
    if (realNeeded === 0 && bufferNeeded === 0 && existing.status === 'A_COMMANDER') {
      await prisma.purchaseListItem.delete({ where: { id: existing.id } });
      return null;
    }
    if (existing.neededQuantity === realNeeded && existing.bufferQuantity === bufferNeeded) return existing;
    return await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: realNeeded, bufferQuantity: bufferNeeded } });
  }
  if (realNeeded > 0 || bufferNeeded > 0) {
    return await prisma.purchaseListItem.create({ data: { productId, neededQuantity: realNeeded, bufferQuantity: bufferNeeded, auto: realNeeded === 0 } });
  }
  return null;
}

// ── Étape 2 : vérification à la confirmation ────────────────────────────────
export async function confirmStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: 'NONE', productId: { not: null } },
    include: { product: true },
  });

  for (const item of items) {
    const product = item.product;
    if (!product) continue;
    const qty = item.quantity;

    // 1. Ce qui est déjà disponible est pris directement (partiel ou total).
    const fromStock = Math.min(product.available, qty);
    if (fromStock > 0) {
      await prisma.product.update({ where: { id: product.id }, data: { available: { decrement: fromStock }, reserved: { increment: fromStock } } });
    }

    const remainder = qty - fromStock;
    if (remainder <= 0) {
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'FROM_STOCK', resolvedQuantity: qty } });
      continue;
    }

    if (product.mode === 'ACHETE') {
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'PURCHASE_PENDING', resolvedQuantity: fromStock } });
      const line = await resyncPurchaseLineForProduct(product.id);
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { purchaseListItemId: line?.id ?? null } });
      continue;
    }

    // 2. Le manquant sur un produit fabriqué → liste de production, matière réservée si dispo.
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'IN_PRODUCTION', resolvedQuantity: fromStock } });
    const line = await resyncProductionLine(product.id);
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { productionListItemId: line?.id ?? null } });
  }

  await checkCompletion(kind, parentId);
}

// ── Vérifie si tous les articles sont résolus → passe la commande en PRODUITE ─
export async function checkCompletion(kind: Kind, parentId: string) {
  const parent = await (parentDelegate(kind) as any).findUnique({ where: { id: parentId }, select: { status: true, source: true, ref: true } });
  if (!parent || parent.status !== 'VALIDE') return;

  const items = await (itemDelegate(kind) as any).findMany({ where: itemWhereParent(kind, parentId) });
  const trackedItems = items.filter((i: any) => i.stockPath !== 'NONE');
  if (trackedItems.length === 0) return;

  const allResolved = trackedItems.every((i: any) => {
    if (i.stockPath === 'FROM_STOCK') return true;
    return i.resolvedQuantity >= i.quantity;
  });
  if (!allResolved) return;

  await (parentDelegate(kind) as any).update({ where: { id: parentId }, data: { status: 'PRODUITE' } });

  // Liaison RollLink (cf. Liaison.md) : commande RollLink prête → notifier RollLink.
  // Best-effort — ne doit jamais faire échouer checkCompletion (cf. rolllink-notify.ts).
  if (kind === 'order' && parent.source === 'ROLLINK' && parent.ref) {
    notifyRollLinkOrderReady(parent.ref).catch(() => {});
  }
}

// ── "Marquer Produit" manuel depuis la commande (admin) ─────────────────────
// Résout la part encore manquante de chaque article (IN_PRODUCTION ou PURCHASE_PENDING),
// dans cet ordre strict, par produit :
//   1. Ce qui est en `available` (stock produit fini réellement disponible).
//   2. Ce qui est `reserved` chez une AUTRE commande/devis déjà "Produite" pour ce même
//      produit — on le lui reprend (la plus RÉCEMMENT créée en premier) ; elle repasse alors
//      "Confirmée" avec un manquant qui réapparaît normalement (elle n'a plus son stock).
//   3. (Fabriqués seulement) fabrication immédiate en consommant la matière première déjà
//      réservée pour cette ligne — dans la limite de ce que la recette permet vraiment.
// S'il reste un manquant après ces 3 étapes → BLOCAGE DUR (rien n'est modifié pour AUCUN
// article de la commande, tout ou rien) : le manquant est renvoyé par produit.

export type ProductShortfall = { productId: string; reference: string; name: string | null; missing: number };

// Combien d'unités de `productId` peut-on fabriquer MAINTENANT avec la matière déjà réservée,
// dans la limite de `cap` — bornée par la matière la plus rare de la recette (jamais une
// recette à moitié suivie). Pas de recette définie → aucune limite matière.
async function manufacturableUnits(productId: string, cap: number): Promise<number> {
  if (cap <= 0) return 0;
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
  if (recipe.length === 0) return cap;
  let manufacturable = cap;
  for (const r of recipe) {
    manufacturable = Math.min(manufacturable, Math.max(0, Math.floor(r.rawMaterial.reserved / r.quantity)));
  }
  return manufacturable;
}

// Candidats "donneurs" pour un produit : commandes/devis déjà "Produite" (autres que la
// commande/devis en cours), triés du plus RÉCEMMENT créé au plus ancien.
async function findDonorItems(productId: string, excludeKind: Kind, excludeParentId: string) {
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, order: { status: 'PRODUITE' }, NOT: excludeKind === 'order' ? { orderId: excludeParentId } : undefined },
      include: { order: { select: { createdAt: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, quote: { status: 'PRODUITE' }, NOT: excludeKind === 'quote' ? { quoteId: excludeParentId } : undefined },
      include: { quote: { select: { createdAt: true } } },
    }),
  ]);
  return [
    ...orderItems.map((i) => ({ id: i.id, kind: 'order' as Kind, parentId: i.orderId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.order.createdAt })),
    ...quoteItems.map((i) => ({ id: i.id, kind: 'quote' as Kind, parentId: i.quoteId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.quote.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Simule (sans RIEN modifier) le plan de résolution complet ci-dessus pour chaque article
// encore ouvert. Retourne le manquant final par produit (vide = tout est réalisable).
export async function previewForceCompleteShortfall(kind: Kind, parentId: string): Promise<ProductShortfall[]> {
  const items = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
    include: { product: true },
  });

  const shortfalls: ProductShortfall[] = [];
  for (const item of items) {
    const stillNeeded = item.quantity - item.resolvedQuantity;
    if (stillNeeded <= 0 || !item.productId || !item.product) continue;

    let remaining = stillNeeded - Math.min(stillNeeded, item.product.available);

    if (remaining > 0) {
      const donors = await findDonorItems(item.productId, kind, parentId);
      for (const d of donors) {
        if (remaining <= 0) break;
        remaining -= Math.min(remaining, d.resolvedQuantity);
      }
    }

    if (remaining > 0 && item.stockPath === 'IN_PRODUCTION') {
      remaining -= await manufacturableUnits(item.productId, remaining);
    }

    if (remaining > 0) {
      shortfalls.push({ productId: item.productId, reference: item.product.reference, name: item.product.name, missing: remaining });
    }
  }
  return shortfalls;
}

export async function forceCompleteOrder(kind: Kind, parentId: string): Promise<void> {
  const items = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
    include: { product: true },
  });

  const touchedProducts = new Set<string>();

  for (const item of items) {
    const stillNeeded = item.quantity - item.resolvedQuantity;
    if (stillNeeded <= 0 || !item.productId || !item.product) continue;

    // 1. Disponible produit d'abord.
    const fromAvailable = Math.min(stillNeeded, item.product.available);
    let remaining = stillNeeded - fromAvailable;

    // 2. Vol chez une autre commande/devis déjà "Produite" (la plus récente en premier) —
    //    transfert interne au pot `reserved` (ne le change pas, juste réattribué).
    const donorSteals: { id: string; kind: Kind; parentId: string; quantity: number; newResolved: number; amount: number }[] = [];
    if (remaining > 0) {
      const donors = await findDonorItems(item.productId, kind, parentId);
      for (const d of donors) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, d.resolvedQuantity);
        if (take <= 0) continue;
        remaining -= take;
        donorSteals.push({ id: d.id, kind: d.kind, parentId: d.parentId, quantity: d.quantity, newResolved: d.resolvedQuantity - take, amount: take });
      }
    }

    // 3. Fabrication immédiate (fabriqués seulement), dans la limite de la matière réservée.
    let manufactured = 0;
    if (remaining > 0 && item.stockPath === 'IN_PRODUCTION') {
      manufactured = await manufacturableUnits(item.productId, remaining);
      if (manufactured > 0) {
        const recipe = await prisma.recipeItem.findMany({ where: { productId: item.productId } });
        for (const r of recipe) {
          const consume = r.quantity * manufactured;
          if (consume > 0) await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { reserved: { decrement: consume } } }).catch(() => {});
        }
      }
      remaining -= manufactured;
    }
    // Le préview vient d'être revérifié juste avant l'appel (côté route) — `remaining` doit
    // être à 0 ici ; par sécurité on ne dépasse jamais ce qui a été validé.
    if (remaining > 0) continue;

    // Applique les vols chez les commandes/devis "Produite" (chacune repasse "Confirmée").
    for (const steal of donorSteals) {
      await (itemDelegate(steal.kind) as any).update({ where: { id: steal.id }, data: { resolvedQuantity: steal.newResolved } });
      if (steal.newResolved < steal.quantity) {
        await (parentDelegate(steal.kind) as any).update({ where: { id: steal.parentId }, data: { status: 'VALIDE' } });
      }
    }

    const newlyReserved = fromAvailable + manufactured; // le vol chez un donneur ne change pas le total réservé
    if (fromAvailable > 0) {
      await prisma.product.update({ where: { id: item.productId }, data: { available: { decrement: fromAvailable } } });
    }
    if (newlyReserved > 0) {
      await prisma.product.update({ where: { id: item.productId }, data: { reserved: { increment: newlyReserved } } });
    }
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { resolvedQuantity: item.quantity } });
    touchedProducts.add(item.productId);
  }

  for (const productId of touchedProducts) {
    await resyncProductionLine(productId);
    await resyncPurchaseLineForProduct(productId);
    // Relie les articles rouverts (vol chez un donneur) à la ligne de liste fraîchement
    // recalculée, comme partout ailleurs (cf. reassessProductReserved).
    const prodLine = await prisma.productionListItem.findFirst({ where: { productId, status: { in: ['A_PRODUIRE', 'BLOQUE'] } } });
    await prisma.orderItem.updateMany({ where: { productId, stockPath: 'IN_PRODUCTION', productionListItemId: null }, data: { productionListItemId: prodLine?.id ?? null } });
    await prisma.quoteItem.updateMany({ where: { productId, stockPath: 'IN_PRODUCTION', productionListItemId: null }, data: { productionListItemId: prodLine?.id ?? null } });
    const purchLine = await prisma.purchaseListItem.findFirst({ where: { productId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });
    await prisma.orderItem.updateMany({ where: { productId, stockPath: 'PURCHASE_PENDING', purchaseListItemId: null }, data: { purchaseListItemId: purchLine?.id ?? null } });
    await prisma.quoteItem.updateMany({ where: { productId, stockPath: 'PURCHASE_PENDING', purchaseListItemId: null }, data: { purchaseListItemId: purchLine?.id ?? null } });
  }
}

// ── Étape 8 (Annulée) / Étape 5 (retrait d'article sur commande confirmée) ──
// Annule l'effet stock d'UN article déjà engagé (utilisé pour l'annulation
// complète de la commande, ou le retrait d'une ligne lors d'une modification).
export async function releaseOrderItemStock(kind: Kind, itemId: string) {
  const item = await (itemDelegate(kind) as any).findUnique({ where: { id: itemId }, include: { product: true } });
  if (!item || item.stockPath === 'NONE') return;

  if (item.resolvedQuantity > 0) {
    // Portion déjà résolue (stock/production/achat) → repasse en Disponible, peu importe le chemin.
    await prisma.product.update({ where: { id: item.productId! }, data: { reserved: { decrement: item.resolvedQuantity }, available: { increment: item.resolvedQuantity } } });
  }

  const stillNeeded = item.quantity - item.resolvedQuantity;
  if (stillNeeded > 0 && item.stockPath === 'IN_PRODUCTION') {
    // Annulation = la matière mise de côté pour cette part ne sert plus à rien → relâchée
    // explicitement ici (jamais plus que ce qui est effectivement réservé). resyncProductionLine,
    // appelée juste après, ne relâche JAMAIS automatiquement pour une baisse de besoin — sinon
    // ce serait compté deux fois (cf. son commentaire) — c'est donc à cet appel-ci de le faire.
    await releaseRawMaterialsForProduction(item.productId!, stillNeeded);
  }

  // On marque l'article NONE AVANT de recalculer — sinon il compterait encore dans son propre
  // besoin dérivé (la requête de resyncProductionLine/resyncPurchaseLineForProduct ne regarde
  // que les articles encore IN_PRODUCTION/PURCHASE_PENDING).
  const wasProduction = item.stockPath === 'IN_PRODUCTION';
  const wasPurchase = item.stockPath === 'PURCHASE_PENDING';
  await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'NONE', resolvedQuantity: 0, purchaseListItemId: null, productionListItemId: null } });

  if (wasProduction) await resyncProductionLine(item.productId!);
  else if (wasPurchase) await resyncPurchaseLineForProduct(item.productId!);

  // Le disponible a pu augmenter ci-dessus → avant de laisser ce surplus compter comme simple
  // rattrapage préventif, on comble en priorité les AUTRES commandes/devis déjà engagés sur
  // ce même produit.
  if (item.productId) await reallocateAvailableStock(item.productId);
}

// ── Réaffectation automatique du disponible vers les commandes déjà engagées ──
// Dès que le disponible d'un produit augmente (annulation, correction...), on comble EN
// PRIORITÉ les commandes/devis déjà engagés en achat/production (FIFO par date de création
// réelle, commandes et devis mélangés) avant de laisser le surplus compter comme rattrapage
// préventif général.
export async function reallocateAvailableStock(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.available <= 0) return;

  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productId, stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
      include: { order: { select: { createdAt: true, priority: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productId, stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
      include: { quote: { select: { createdAt: true, priority: true } } },
    }),
  ]);

  const pending = [
    ...orderItems.map((i) => ({
      id: i.id, kind: 'order' as Kind, parentId: i.orderId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity,
      stockPath: i.stockPath, createdAt: i.order.createdAt, priority: i.order.priority,
    })),
    ...quoteItems.map((i) => ({
      id: i.id, kind: 'quote' as Kind, parentId: i.quoteId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity,
      stockPath: i.stockPath, createdAt: i.quote.createdAt, priority: i.quote.priority,
    })),
  ].filter((i) => i.quantity - i.resolvedQuantity > 0)
    .sort(fifoCompare);

  const touchedParents = new Set<string>();
  let available = product.available;
  let touchedProduction = false;
  let touchedPurchase = false;

  for (const it of pending) {
    if (available <= 0) break;
    const need = it.quantity - it.resolvedQuantity;
    const take = Math.min(need, available);
    if (take <= 0) continue;
    available -= take;

    await prisma.product.update({ where: { id: productId }, data: { available: { decrement: take }, reserved: { increment: take } } });
    await (itemDelegate(it.kind) as any).update({ where: { id: it.id }, data: { resolvedQuantity: { increment: take } } });

    if (it.stockPath === 'IN_PRODUCTION') {
      // Cette part ne sera plus fabriquée (satisfaite directement par le stock) → la matière
      // première qui lui était réservée n'est plus nécessaire, on la relâche.
      await releaseRawMaterialsForProduction(productId, take);
      touchedProduction = true;
    } else if (it.stockPath === 'PURCHASE_PENDING') {
      touchedPurchase = true;
    }

    touchedParents.add(`${it.kind}:${it.parentId}`);
  }

  // Le disponible a pu bouger (à la hausse à l'entrée, puis à nouveau à la baisse ci-dessus si
  // une partie a été réaffectée) → recalcule toujours, même si rien n'a été réaffecté (sinon la
  // ligne reste périmée jusqu'à la prochaine action sur ce produit).
  if (touchedProduction || (await prisma.productionListItem.findFirst({ where: { productId, status: { in: ['A_PRODUIRE', 'BLOQUE'] } } }))) {
    await resyncProductionLine(productId);
  }
  if (touchedPurchase || (await prisma.purchaseListItem.findFirst({ where: { productId, status: { in: [...OPEN_PURCHASE_STATUSES] } } }))) {
    await resyncPurchaseLineForProduct(productId);
  }

  for (const key of touchedParents) {
    const [k, pid] = key.split(':') as [Kind, string];
    await checkCompletion(k, pid);
  }
}

// ── Symétrique de reallocateAvailableStock : à appeler quand `product.reserved` vient de
// BAISSER par une correction manuelle (le stock mis de côté pour des commandes déjà résolues
// diminue, sans qu'aucune commande n'ait elle-même changé). Reprend la couverture aux
// commandes/devis concernés — les plus RÉCENTES perdent leur couverture en premier (FIFO par
// ancienneté, les plus anciennes gardent la priorité), symétrique à reassessProductionForMaterial.
// Seules les commandes encore actives comptent (VALIDE/PRODUITE — pas encore Livrées, dont la
// part a déjà quitté `reserved` via deliverStock ; pas Annulées/Retournées, déjà remises à 0).
export async function reassessProductReserved(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;

  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, order: { status: { in: ['VALIDE', 'PRODUITE'] } } },
      include: { order: { select: { createdAt: true, priority: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, quote: { status: { in: ['VALIDE', 'PRODUITE'] } } },
      include: { quote: { select: { createdAt: true, priority: true } } },
    }),
  ]);

  const claims = [
    ...orderItems.map((i) => ({ id: i.id, kind: 'order' as Kind, resolvedQuantity: i.resolvedQuantity, createdAt: i.order.createdAt, priority: i.order.priority })),
    ...quoteItems.map((i) => ({ id: i.id, kind: 'quote' as Kind, resolvedQuantity: i.resolvedQuantity, createdAt: i.quote.createdAt, priority: i.quote.priority })),
  ].sort(fifoCompare);

  let poolLeft = product.reserved;
  let touchedAny = false;
  const newStockPath = product.mode === 'ACHETE' ? 'PURCHASE_PENDING' : 'IN_PRODUCTION';

  for (const claim of claims) {
    if (poolLeft >= claim.resolvedQuantity) {
      poolLeft -= claim.resolvedQuantity;
      continue;
    }
    const covered = Math.max(0, poolLeft);
    const takeBack = claim.resolvedQuantity - covered;
    poolLeft = 0;
    if (takeBack <= 0) continue;

    await (itemDelegate(claim.kind) as any).update({
      where: { id: claim.id },
      data: { resolvedQuantity: claim.resolvedQuantity - takeBack, stockPath: newStockPath },
    });
    touchedAny = true;
  }

  if (!touchedAny) return;

  if (product.mode === 'FABRIQUE' || product.mode === 'LES_DEUX') {
    const line = await resyncProductionLine(productId);
    await prisma.orderItem.updateMany({ where: { productId, stockPath: 'IN_PRODUCTION', productionListItemId: null }, data: { productionListItemId: line?.id ?? null } });
    await prisma.quoteItem.updateMany({ where: { productId, stockPath: 'IN_PRODUCTION', productionListItemId: null }, data: { productionListItemId: line?.id ?? null } });
  }
  if (product.mode === 'ACHETE' || product.mode === 'LES_DEUX') {
    const line = await resyncPurchaseLineForProduct(productId);
    await prisma.orderItem.updateMany({ where: { productId, stockPath: 'PURCHASE_PENDING', purchaseListItemId: null }, data: { purchaseListItemId: line?.id ?? null } });
    await prisma.quoteItem.updateMany({ where: { productId, stockPath: 'PURCHASE_PENDING', purchaseListItemId: null }, data: { purchaseListItemId: line?.id ?? null } });
  }
}

// ── Modification de la quantité d'un article DÉJÀ engagé (même produit) ──────
// Met juste à jour `quantity`/`resolvedQuantity` sur l'article et sa réservation matière/
// stock propre, puis délègue TOUJOURS le recalcul de la ligne de liste au resync dérivé —
// plus besoin de distinguer les statuts "ajustables" ou pas, le recalcul repart des
// commandes à chaque fois, quel que soit l'état de la ligne.
export async function adjustOrderItemQuantity(kind: Kind, itemId: string, newQuantity: number) {
  const item = await (itemDelegate(kind) as any).findUnique({ where: { id: itemId }, include: { product: true } });
  if (!item || !item.productId) return;
  const oldQuantity = item.quantity;
  if (newQuantity === oldQuantity) return;

  if (item.stockPath === 'NONE') {
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { quantity: newQuantity } });
    return;
  }

  // Portion déjà résolue en trop (si on réduit sous ce qui était déjà couvert) → redevient
  // disponible immédiatement, avant même le recalcul dérivé (qui ne regarde que le manquant).
  const newResolved = Math.min(item.resolvedQuantity, newQuantity);
  const excessResolved = item.resolvedQuantity - newResolved;
  if (excessResolved > 0) {
    await prisma.product.update({ where: { id: item.productId }, data: { reserved: { decrement: excessResolved }, available: { increment: excessResolved } } });
  }
  await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { quantity: newQuantity, resolvedQuantity: newResolved } });

  if (item.stockPath === 'FROM_STOCK' && newQuantity > oldQuantity) {
    // Le complément est pris sur le stock dispo si possible, le manquant part en production/achat.
    const delta = newQuantity - oldQuantity;
    const fromStock = Math.min(item.product.available, delta);
    if (fromStock > 0) {
      await prisma.product.update({ where: { id: item.productId }, data: { available: { decrement: fromStock }, reserved: { increment: fromStock } } });
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { resolvedQuantity: { increment: fromStock } } });
    }
    const remainder = delta - fromStock;
    if (remainder > 0) {
      const newStockPath = item.product.mode === 'ACHETE' ? 'PURCHASE_PENDING' : 'IN_PRODUCTION';
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: newStockPath } });
      if (newStockPath === 'IN_PRODUCTION') {
        const line = await resyncProductionLine(item.productId);
        await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { productionListItemId: line?.id ?? null } });
      } else {
        const line = await resyncPurchaseLineForProduct(item.productId);
        await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { purchaseListItemId: line?.id ?? null } });
      }
    }
    return;
  }

  if (item.stockPath === 'IN_PRODUCTION') {
    if (newQuantity < oldQuantity) {
      // Réduction = la part de matière mise de côté pour ce qui n'est plus demandé ne sert
      // plus à rien → relâchée explicitement ici. resyncProductionLine ne le fait JAMAIS
      // automatiquement pour une baisse de besoin (elle pourrait aussi venir d'une production
      // réelle, où il ne faudrait rien relâcher) — c'est donc à cet appel-ci de le faire.
      const oldOutstanding = oldQuantity - item.resolvedQuantity;
      const newOutstanding = newQuantity - newResolved;
      const outstandingDelta = oldOutstanding - newOutstanding;
      if (outstandingDelta > 0) await releaseRawMaterialsForProduction(item.productId, outstandingDelta);
    }
    const line = await resyncProductionLine(item.productId);
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { productionListItemId: line?.id ?? null } });
  } else if (item.stockPath === 'PURCHASE_PENDING') {
    const line = await resyncPurchaseLineForProduct(item.productId);
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { purchaseListItemId: line?.id ?? null } });
  }
}

// Annule le stock de TOUS les articles d'une commande/devis (statut → Annulé)
export async function cancelStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), stockPath: { not: 'NONE' } } });
  for (const item of items) await releaseOrderItemStock(kind, item.id);
}

// ── Étape "Retourné" ─────────────────────────────────────────────────────────
export async function returnStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), productId: { not: null } } });
  for (const item of items) {
    if (!item.productId || !item.quantity) continue;
    await prisma.product.update({ where: { id: item.productId }, data: { returned: { increment: item.quantity } } });
  }
}

// ── Étape "Livrée" ───────────────────────────────────────────────────────────
export async function deliverStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), productId: { not: null } } });
  for (const item of items) {
    if (!item.productId || !item.resolvedQuantity) continue;
    await prisma.product.update({ where: { id: item.productId }, data: { reserved: { decrement: item.resolvedQuantity } } });
  }
}

// ── Distribution d'une quantité produite/reçue vers les commandes/devis liés ──
// FIFO par date de création réelle. La portion effectivement affectée à une commande/devis
// va dans `reserved` ; le reliquat éventuel (sans commande liée) va dans `available`.
async function distributeToLinkedItems(
  linkField: 'productionListItemId' | 'purchaseListItemId',
  listItemId: string,
  producedOrReceivedQty: number,
  productId: string,
) {
  let remaining = producedOrReceivedQty;
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({ where: { [linkField]: listItemId }, include: { order: { select: { createdAt: true, priority: true } } } }),
    prisma.quoteItem.findMany({ where: { [linkField]: listItemId }, include: { quote: { select: { createdAt: true, priority: true } } } }),
  ]);
  const linked: { id: string; kind: Kind; parentId: string; quantity: number; resolvedQuantity: number; createdAt: Date; priority: boolean }[] = [
    ...orderItems.map((i) => ({ id: i.id, kind: 'order' as Kind, parentId: i.orderId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.order.createdAt, priority: i.order.priority })),
    ...quoteItems.map((i) => ({ id: i.id, kind: 'quote' as Kind, parentId: i.quoteId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.quote.createdAt, priority: i.quote.priority })),
  ].sort(fifoCompare);

  const touchedParents = new Set<string>();
  for (const li of linked) {
    if (remaining <= 0) break;
    const need = li.quantity - li.resolvedQuantity;
    if (need <= 0) continue;
    const take = Math.min(need, remaining);
    remaining -= take;
    await (itemDelegate(li.kind) as any).update({ where: { id: li.id }, data: { resolvedQuantity: { increment: take } } });
    await prisma.product.update({ where: { id: productId }, data: { reserved: { increment: take } } });
    touchedParents.add(`${li.kind}:${li.parentId}`);
  }

  if (remaining > 0) {
    // Reliquat sans commande/devis en attente → part en stock disponible général.
    await prisma.product.update({ where: { id: productId }, data: { available: { increment: remaining } } });
  }

  for (const key of touchedParents) {
    const [k, pid] = key.split(':') as [Kind, string];
    await checkCompletion(k, pid);
  }
}

export async function distributeProduction(productionListItemId: string, producedQty: number, productId: string) {
  await distributeToLinkedItems('productionListItemId', productionListItemId, producedQty, productId);
}

export async function distributePurchase(purchaseListItemId: string, receivedQty: number, productId: string) {
  await distributeToLinkedItems('purchaseListItemId', purchaseListItemId, receivedQty, productId);
}

// ── Étape 3 point 4 : déblocage des lignes de production en attente de matière ──────────────
// À appeler après qu'une matière première a reçu du stock. Réserve d'un coup, sur le pot
// commun, tout ce qui manque réellement pour les lignes "Bloquées" (borné par ce qui est
// dispo), puis simule un parcours FIFO pour savoir lesquelles sont désormais entièrement
// couvertes pour cette matière — pour celles-là seulement, tente les autres ingrédients de la
// recette et débloque si tout est bon. Ne porte que sur le BESOIN RÉEL (jamais le buffer, qui
// ne réserve plus jamais de matière, cf. resyncProductionLine).
export async function unblockProductionForMaterial(rawMaterialId: string) {
  const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material) return;

  const blockedLines = await prisma.productionListItem.findMany({
    where: { status: 'BLOQUE', product: { recipeItems: { some: { rawMaterialId } } } },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: { recipeItems: true } } },
  });
  if (blockedLines.length === 0) return;

  const ratioByLine = new Map(blockedLines.map((l) => [l.id, l.product.recipeItems.find((r) => r.rawMaterialId === rawMaterialId)?.quantity ?? 0]));
  const totalOwed = blockedLines.reduce((sum, l) => sum + (ratioByLine.get(l.id) ?? 0) * l.neededQuantity, 0);
  const toReserve = Math.min(Math.max(0, totalOwed - material.reserved), material.available);
  if (toReserve > 0) {
    await prisma.rawMaterial.update({ where: { id: rawMaterialId }, data: { available: { decrement: toReserve }, reserved: { increment: toReserve } } });
  }

  const touchedMaterials = new Set<string>([rawMaterialId]);
  const freshMaterial = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  let poolLeft = freshMaterial!.reserved;

  for (const line of blockedLines) {
    const ratio = ratioByLine.get(line.id) ?? 0;
    if (ratio <= 0) continue;
    const owed = ratio * line.neededQuantity;
    if (poolLeft < owed) break; // FIFO : s'arrête à la première ligne pas encore couverte pour cette matière
    poolLeft -= owed;

    const recipe = await prisma.recipeItem.findMany({ where: { productId: line.productId }, include: { rawMaterial: true } });
    const stillMissingOther = recipe.some((r) => r.rawMaterialId !== rawMaterialId && r.rawMaterial.available < r.quantity * line.neededQuantity);
    if (stillMissingOther) continue;

    for (const r of recipe) {
      if (r.rawMaterialId === rawMaterialId) continue;
      const needed = r.quantity * line.neededQuantity;
      await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { available: { decrement: needed }, reserved: { increment: needed } } });
      touchedMaterials.add(r.rawMaterialId);
    }
    await prisma.productionListItem.update({ where: { id: line.id }, data: { status: 'A_PRODUIRE' } });
  }

  for (const matId of touchedMaterials) await resyncMaterialPurchaseNeed(matId);
}

// ── Symétrique de unblockProductionForMaterial : à appeler après avoir PRIS de la matière déjà
// réservée pour satisfaire une production en cours (cf. "Marquer fabriquée" — quand il n'y a
// pas assez de matière pour la ligne qu'on produit, on va piocher dans le pot commun `reserved`,
// quitte à moins couvrir d'autres lignes "À produire" qui comptaient dessus). Simule le même
// parcours FIFO par ancienneté (les plus anciennes gardent la priorité) : dès qu'une ligne n'est
// plus couverte par ce qui reste dans `reserved`, elle ET TOUTES LES SUIVANTES (plus récentes,
// donc moins prioritaires) repassent "Bloquée" — c'est sur les commandes les plus récentes que
// le manque retombe en premier. Ne recalcule que le statut (jamais la quantité) ; le manquant se
// répercute automatiquement en liste d'achat matière via resyncMaterialPurchaseNeed à la fin
// (elle somme déjà needed+buffer de toutes les lignes ouvertes, peu importe leur statut).
export async function reassessProductionForMaterial(rawMaterialId: string) {
  const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material) return;

  const openLines = await prisma.productionListItem.findMany({
    where: { status: 'A_PRODUIRE', product: { recipeItems: { some: { rawMaterialId } } } },
    orderBy: { createdAt: 'asc' },
    include: { product: { include: { recipeItems: true } } },
  });
  if (openLines.length === 0) { await resyncMaterialPurchaseNeed(rawMaterialId); return; }

  let poolLeft = material.reserved;
  let stillCovered = true;
  for (const line of openLines) {
    const ratio = line.product.recipeItems.find((r) => r.rawMaterialId === rawMaterialId)?.quantity ?? 0;
    if (ratio <= 0) continue;
    const owed = ratio * line.neededQuantity;
    if (stillCovered && poolLeft >= owed) {
      poolLeft -= owed;
      continue;
    }
    stillCovered = false; // dès qu'une ligne n'est plus couverte, toutes les suivantes (plus récentes) non plus
    await prisma.productionListItem.update({ where: { id: line.id }, data: { status: 'BLOQUE' } });
  }

  await resyncMaterialPurchaseNeed(rawMaterialId);
}

// ── "Production urgente" — commandes/devis prioritaires ──────────────────────────────────────
// Agrégation en LECTURE SEULE (jamais stockée, comme le badge "Bloqué" par commande) : pour
// chaque produit fabriqué, la somme du manquant réel (quantity − resolvedQuantity) des seuls
// articles IN_PRODUCTION appartenant à une commande/devis marqué "prioritaire" ET encore VALIDE
// (pas déjà PRODUITE/LIVRÉE/ANNULÉE/RETOURNÉE — plus rien à produire pour elle dans ces cas).
// Ne change RIEN au reste de la liste de production (les cartes normales restent inchangées,
// leur `needed` continue d'inclure TOUTES les commandes, prioritaires ou pas) — c'est un
// résumé à part, qui disparaît de lui-même dès que toutes les commandes prioritaires sont
// entièrement produites (plus aucun manquant à sommer).
export type UrgentProductionNeed = { productId: string; reference: string; name: string | null; quantity: number };

export async function getUrgentProductionNeeds(): Promise<UrgentProductionNeed[]> {
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { stockPath: 'IN_PRODUCTION', order: { priority: true, status: 'VALIDE' } },
      select: { productId: true, quantity: true, resolvedQuantity: true, product: { select: { reference: true, name: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { stockPath: 'IN_PRODUCTION', quote: { priority: true, status: 'VALIDE' } },
      select: { productId: true, quantity: true, resolvedQuantity: true, product: { select: { reference: true, name: true } } },
    }),
  ]);

  const totals = new Map<string, UrgentProductionNeed>();
  for (const i of [...orderItems, ...quoteItems]) {
    if (!i.productId || !i.product) continue;
    const outstanding = i.quantity - i.resolvedQuantity;
    if (outstanding <= 0) continue;
    const existing = totals.get(i.productId);
    if (existing) existing.quantity += outstanding;
    else totals.set(i.productId, { productId: i.productId, reference: i.product.reference, name: i.product.name, quantity: outstanding });
  }
  return [...totals.values()].sort((a, b) => b.quantity - a.quantity);
}
