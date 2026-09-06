import { prisma } from './prisma';

// ═══════════════════════════════════════════════════════════════════════════
// Logique de stock déclenchée par le cycle de vie des commandes/devis.
// cf. doc "Logique du Stock, de la Liste d'achats et de la Liste de production".
//
// Simplifications assumées (phase 2, à affiner si besoin réel) :
// - Pas d'étape "En livraison" automatique : le statut LIVRE décrémente
//   directement `reserved`. `inDelivery` reste disponible pour un usage manuel
//   (Correction, page Stock) si le suivi transporteur en a besoin plus tard.
// - "Commandes concernées" (traçabilité multi-commandes par ligne de liste)
//   n'est pas affichée dans l'UI — seul le lien technique (OrderItem/QuoteItem
//   → PurchaseListItem/ProductionListItem) existe, pour permettre la reprise.
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

// ── Trouve ou crée la ligne de liste d'achat/production pour un produit ────
// Une seule carte par produit/matière tant qu'elle n'est pas soldée (RECU/PRODUIT) :
// tout nouveau besoin s'ajoute au manquant de la carte déjà ouverte, jamais une 2e carte.
export const OPEN_PURCHASE_STATUSES = ['A_COMMANDER', 'COMMANDE'] as const;
export const OPEN_PRODUCTION_STATUSES = ['A_PRODUIRE', 'BLOQUE', 'EN_COURS'] as const;

async function findOrCreatePurchaseItemForProduct(productId: string, extraQty: number) {
  const existing = await prisma.purchaseListItem.findFirst({
    where: { productId, status: { in: [...OPEN_PURCHASE_STATUSES] } },
  });
  if (existing) {
    return prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: { increment: extraQty } } });
  }
  return prisma.purchaseListItem.create({ data: { productId, neededQuantity: extraQty, auto: false } });
}

async function findOrCreatePurchaseItemForMaterial(rawMaterialId: string, extraQty: number) {
  const existing = await prisma.purchaseListItem.findFirst({
    where: { rawMaterialId, status: { in: [...OPEN_PURCHASE_STATUSES] } },
  });
  if (existing) {
    return prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: { increment: extraQty } } });
  }
  return prisma.purchaseListItem.create({ data: { rawMaterialId, neededQuantity: extraQty, auto: false } });
}

async function findOrCreateProductionItemForProduct(productId: string, extraQty: number) {
  const existing = await prisma.productionListItem.findFirst({
    where: { productId, status: { in: [...OPEN_PRODUCTION_STATUSES] } },
  });
  if (existing) {
    return prisma.productionListItem.update({ where: { id: existing.id }, data: { neededQuantity: { increment: extraQty } } });
  }
  return prisma.productionListItem.create({ data: { productId, neededQuantity: extraQty, auto: false } });
}

// Réserve les matières premières nécessaires pour produire `qty` unités d'un produit.
// Ce qui est disponible est déplacé de `available` vers `reserved` ; ce qui manque
// est ajouté à la liste d'achat. Retourne le statut résultant de la ligne de production.
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
    const missing = needed - reservable;
    if (missing > 0) {
      blocked = true;
      await findOrCreatePurchaseItemForMaterial(mat.id, missing);
    }
  }
  return blocked ? 'BLOQUE' : 'A_PRODUIRE';
}

// Recalcule immédiatement bufferQuantity pour UN produit, sur la carte déjà ouverte si elle
// existe (jamais de nouvelle carte créée — on met à jour celle qui est là). Utilisé juste après
// avoir relâché la matière d'un ancien buffer (ex: annulation de commande) pour ne pas laisser
// la carte à 0 en attendant le prochain chargement de la page Stock — cf. stock-lists.ts pour
// la même logique appliquée en boucle à tous les produits.
export async function resyncProductionBufferForProduct(productId: string, existingLine?: { id: string; neededQuantity: number; bufferQuantity: number; status: string } | null) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !(product.mode === 'FABRIQUE' || product.mode === 'LES_DEUX')) return;

  const existing = existingLine !== undefined
    ? existingLine
    : await prisma.productionListItem.findFirst({ where: { productId, status: { in: ['A_PRODUIRE', 'BLOQUE'] } } });

  const target = product.available < product.productionThreshold ? Math.max(0, product.stockMax - product.available) : 0;

  if (existing) {
    if (existing.neededQuantity === 0 && target === 0) {
      if (existing.bufferQuantity > 0) await releaseRawMaterialsForProduction(productId, existing.bufferQuantity);
      await prisma.productionListItem.delete({ where: { id: existing.id } });
      return;
    }
    if (existing.bufferQuantity === target) return;
    const delta = target - existing.bufferQuantity;
    let deltaStatus: 'A_PRODUIRE' | 'BLOQUE' = 'A_PRODUIRE';
    if (delta > 0) deltaStatus = await reserveRawMaterialsForProduction(productId, delta);
    else if (delta < 0) await releaseRawMaterialsForProduction(productId, -delta);
    const status = existing.status === 'BLOQUE' || deltaStatus === 'BLOQUE' ? 'BLOQUE' : 'A_PRODUIRE';
    await prisma.productionListItem.update({ where: { id: existing.id }, data: { bufferQuantity: target, status } });
    return;
  }

  if (target > 0) {
    const status = await reserveRawMaterialsForProduction(productId, target);
    await prisma.productionListItem.create({ data: { productId, neededQuantity: 0, bufferQuantity: target, status, auto: true } });
  }
}

// Équivalent achat de resyncProductionBufferForProduct ci-dessus — même principe (recalcule
// tout de suite sur la carte déjà ouverte, jamais une nouvelle), mais sans matière première à
// réserver/relâcher puisque l'achat ne consomme jamais rien d'autre en interne.
export async function resyncPurchaseBuffer(
  target: { productId: string } | { rawMaterialId: string },
  existingLine?: { id: string; neededQuantity: number; bufferQuantity: number } | null,
) {
  const source = 'productId' in target
    ? await prisma.product.findUnique({ where: { id: target.productId } })
    : await prisma.rawMaterial.findUnique({ where: { id: target.rawMaterialId } });
  if (!source) return;
  if ('mode' in source && !(source.mode === 'ACHETE' || source.mode === 'LES_DEUX')) return;

  const existing = existingLine !== undefined
    ? existingLine
    : await prisma.purchaseListItem.findFirst({ where: { ...target, status: { in: [...OPEN_PURCHASE_STATUSES] } } });

  const targetQty = source.available < source.purchaseThreshold ? Math.max(0, source.stockMax - source.available) : 0;

  if (existing) {
    if (existing.neededQuantity === 0 && targetQty === 0) {
      await prisma.purchaseListItem.delete({ where: { id: existing.id } });
      return;
    }
    if (existing.bufferQuantity === targetQty) return;
    await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { bufferQuantity: targetQty } });
    return;
  }

  if (targetQty > 0) {
    await prisma.purchaseListItem.create({ data: { ...target, neededQuantity: 0, bufferQuantity: targetQty, auto: true } });
  }
}

// Symétrique de reserveRawMaterialsForProduction : relâche les matières réservées
// pour `qty` unités d'un produit (reserved → available), et réduit/supprime la
// part correspondante en liste d'achat pour ce qui n'était pas encore réservé.
export async function releaseRawMaterialsForProduction(productId: string, qty: number) {
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
  for (const r of recipe) {
    const needed = r.quantity * qty;
    const releasedFromReserved = Math.min(needed, r.rawMaterial.reserved);
    if (releasedFromReserved > 0) {
      await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { reserved: { decrement: releasedFromReserved }, available: { increment: releasedFromReserved } } }).catch(() => {});
    }
    const stillMissing = needed - releasedFromReserved;
    if (stillMissing > 0) {
      const matPli = await prisma.purchaseListItem.findFirst({ where: { rawMaterialId: r.rawMaterialId, status: 'A_COMMANDER' } });
      if (matPli) {
        const matRemaining = matPli.neededQuantity - stillMissing;
        if (matRemaining <= 0) await prisma.purchaseListItem.delete({ where: { id: matPli.id } }).catch(() => {});
        else await prisma.purchaseListItem.update({ where: { id: matPli.id }, data: { neededQuantity: matRemaining } }).catch(() => {});
      }
    }
  }
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

    // 1. Ce qui est déjà disponible est pris directement (partiel ou total),
    // décrémenté et réservé pour cette commande.
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
      // 3. Le manquant sur un produit acheté → liste d'achat
      const pli = await findOrCreatePurchaseItemForProduct(product.id, remainder);
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'PURCHASE_PENDING', purchaseListItemId: pli.id, resolvedQuantity: fromStock } });
      continue;
    }

    // 2. Le manquant sur un produit fabriqué → liste de production immédiatement,
    // matières réservées si dispo, sinon ajoutées à la liste d'achat (bloqué).
    const pli = await findOrCreateProductionItemForProduct(product.id, remainder);
    const status = await reserveRawMaterialsForProduction(product.id, remainder);
    await prisma.productionListItem.update({ where: { id: pli.id }, data: { status } });
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'IN_PRODUCTION', productionListItemId: pli.id, resolvedQuantity: fromStock } });
  }

  await checkCompletion(kind, parentId);
}

// ── Vérifie si tous les articles sont résolus → passe la commande en PRODUITE ─
export async function checkCompletion(kind: Kind, parentId: string) {
  const parent = await (parentDelegate(kind) as any).findUnique({ where: { id: parentId }, select: { status: true } });
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
}

// ── Étape 8 (Annulée) / Étape 5 (retrait d'article sur commande confirmée) ──
// Annule l'effet stock d'UN article déjà engagé (utilisé pour l'annulation
// complète de la commande, ou le retrait d'une ligne lors d'une modification).
export async function releaseOrderItemStock(kind: Kind, itemId: string) {
  const item = await (itemDelegate(kind) as any).findUnique({ where: { id: itemId }, include: { product: true, purchaseListItem: true, productionListItem: true } });
  if (!item || item.stockPath === 'NONE') return;

  if (item.stockPath === 'FROM_STOCK') {
    // Déjà réservé (ou produit/reçu) → repasse en Disponible
    if (item.resolvedQuantity > 0) {
      await prisma.product.update({ where: { id: item.productId! }, data: { reserved: { decrement: item.resolvedQuantity }, available: { increment: item.resolvedQuantity } } });
    }
  } else if (item.stockPath === 'IN_PRODUCTION' && item.productionListItem) {
    const pli = item.productionListItem;
    if (item.resolvedQuantity > 0) {
      // Portion déjà fabriquée → repasse de Réservé à Disponible
      await prisma.product.update({ where: { id: item.productId! }, data: { reserved: { decrement: item.resolvedQuantity }, available: { increment: item.resolvedQuantity } } });
    }
    const stillNeeded = item.quantity - item.resolvedQuantity;
    if (stillNeeded > 0 && pli.status !== 'PRODUIT') {
      // Portion pas encore fabriquée → libère la réservation de matière première
      // correspondante, et réduit/supprime la ligne de production. La quantité
      // réellement réservée peut être inférieure à `qty` (ligne bloquée, matière
      // en partie seulement en stock) → on ne libère jamais plus que ce qui est
      // effectivement réservé, pour ne pas faire passer `reserved` en négatif.
      await releaseRawMaterialsForProduction(item.productId!, stillNeeded);
      const remaining = Math.max(0, pli.neededQuantity - stillNeeded);
      // Statut remis à "propre" : le blocage éventuel était peut-être dû à la part qu'on
      // vient de relâcher — resyncProductionBufferForProduct détermine seul le vrai statut
      // à partir de ce qu'il reste réellement à réserver (besoin restant + buffer).
      await prisma.productionListItem.update({ where: { id: pli.id }, data: { neededQuantity: remaining, status: 'A_PRODUIRE' } });
      // Recalcule tout de suite le buffer sur CETTE MÊME carte (jamais une nouvelle), que le
      // besoin réel tombe à 0 ou pas : le disponible a pu changer (portion reprise sur stock),
      // pas la peine d'attendre le prochain chargement de la page Stock pour que ce soit juste.
      await resyncProductionBufferForProduct(item.productId!, { id: pli.id, neededQuantity: remaining, bufferQuantity: pli.bufferQuantity, status: 'A_PRODUIRE' });
    }
  } else if (item.stockPath === 'PURCHASE_PENDING' && item.purchaseListItem) {
    const pli = item.purchaseListItem;
    if (item.resolvedQuantity > 0) {
      // Déjà reçu → repasse de Réservé à Disponible
      await prisma.product.update({ where: { id: item.productId! }, data: { reserved: { decrement: item.resolvedQuantity }, available: { increment: item.resolvedQuantity } } });
    }
    const stillNeeded = item.quantity - item.resolvedQuantity;
    if (stillNeeded > 0 && pli.status !== 'RECU') {
      const remaining = Math.max(0, pli.neededQuantity - stillNeeded);
      await prisma.purchaseListItem.update({ where: { id: pli.id }, data: { neededQuantity: remaining } });
      // Recalcule tout de suite le buffer sur CETTE MÊME carte (jamais une nouvelle), que le
      // besoin réel tombe à 0 ou pas — même principe que côté production (cf. plus haut).
      await resyncPurchaseBuffer({ productId: item.productId! }, { id: pli.id, neededQuantity: remaining, bufferQuantity: pli.bufferQuantity });
    }
  }

  await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'NONE', resolvedQuantity: 0, purchaseListItemId: null, productionListItemId: null } });

  // Le disponible a pu augmenter ci-dessus (portion reprise sur stock relâchée) → avant de
  // laisser ce surplus compter comme simple rattrapage préventif, on comble en priorité les
  // AUTRES commandes/devis déjà engagés en achat/production sur ce même produit.
  if (item.productId) await reallocateAvailableStock(item.productId);
}

// ── Réaffectation automatique du disponible vers les commandes déjà engagées ──
// Dès que le disponible d'un produit augmente (annulation, correction...), on comble EN
// PRIORITÉ les commandes/devis déjà engagés en achat/production (FIFO par date de création
// réelle, commandes et devis mélangés) avant de laisser le surplus compter comme rattrapage
// préventif général. Sans ça, du stock qui redevient disponible resterait inutilisé pendant
// qu'on continue à vouloir en acheter/produire pour satisfaire ces mêmes commandes.
export async function reallocateAvailableStock(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.available <= 0) return;

  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productId, stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
      include: { order: { select: { createdAt: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productId, stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
      include: { quote: { select: { createdAt: true } } },
    }),
  ]);

  const pending = [
    ...orderItems.map((i) => ({
      id: i.id, kind: 'order' as Kind, parentId: i.orderId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity,
      stockPath: i.stockPath, purchaseListItemId: i.purchaseListItemId, productionListItemId: i.productionListItemId,
      createdAt: i.order.createdAt,
    })),
    ...quoteItems.map((i) => ({
      id: i.id, kind: 'quote' as Kind, parentId: i.quoteId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity,
      stockPath: i.stockPath, purchaseListItemId: i.purchaseListItemId, productionListItemId: i.productionListItemId,
      createdAt: i.quote.createdAt,
    })),
  ].filter((i) => i.quantity - i.resolvedQuantity > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const touchedParents = new Set<string>();
  let available = product.available;

  for (const it of pending) {
    if (available <= 0) break;
    const need = it.quantity - it.resolvedQuantity;
    const take = Math.min(need, available);
    if (take <= 0) continue;
    available -= take;

    await prisma.product.update({ where: { id: productId }, data: { available: { decrement: take }, reserved: { increment: take } } });
    await (itemDelegate(it.kind) as any).update({ where: { id: it.id }, data: { resolvedQuantity: { increment: take } } });

    if (it.stockPath === 'IN_PRODUCTION' && it.productionListItemId) {
      // Cette part ne sera plus fabriquée (satisfaite directement par le stock) → la matière
      // première qui lui était réservée n'est plus nécessaire, on la relâche.
      await releaseRawMaterialsForProduction(productId, take);
      const pli = await prisma.productionListItem.findUnique({ where: { id: it.productionListItemId } });
      if (pli) await prisma.productionListItem.update({ where: { id: pli.id }, data: { neededQuantity: Math.max(0, pli.neededQuantity - take) } });
    } else if (it.stockPath === 'PURCHASE_PENDING' && it.purchaseListItemId) {
      const pli = await prisma.purchaseListItem.findUnique({ where: { id: it.purchaseListItemId } });
      if (pli) await prisma.purchaseListItem.update({ where: { id: pli.id }, data: { neededQuantity: Math.max(0, pli.neededQuantity - take) } });
    }

    touchedParents.add(`${it.kind}:${it.parentId}`);
  }

  if (touchedParents.size === 0) return;

  // Le disponible a bougé (baissé, puisqu'une partie vient d'être réaffectée) → le buffer de
  // cette même carte doit être recalculé tout de suite, comme pour une annulation classique.
  await resyncProductionBufferForProduct(productId);
  await resyncPurchaseBuffer({ productId });

  for (const key of touchedParents) {
    const [k, pid] = key.split(':') as [Kind, string];
    await checkCompletion(k, pid);
  }
}

// ── Modification de la quantité d'un article DÉJÀ engagé (même produit) ──────
// Ajuste par delta plutôt que de tout relâcher puis reconfirmer : on ne perturbe
// que ce qui doit l'être, et on grossit/réduit la ligne de liste déjà liée à cet
// article au lieu de risquer de fusionner avec une autre ligne du même produit
// (findOrCreate* rattache à la 1ère ligne A_PRODUIRE/BLOQUE/A_COMMANDER trouvée,
// qui peut appartenir à une tout autre commande).
export async function adjustOrderItemQuantity(kind: Kind, itemId: string, newQuantity: number) {
  const item = await (itemDelegate(kind) as any).findUnique({ where: { id: itemId }, include: { product: true, purchaseListItem: true, productionListItem: true } });
  if (!item || !item.productId) return;
  const oldQuantity = item.quantity;
  if (newQuantity === oldQuantity) return;

  // Pas encore confirmé (stockPath NONE, ou déjà VALIDE mais article pas encore
  // traité par confirmStock) → rien à ajuster côté stock, confirmStock s'en chargera.
  if (item.stockPath === 'NONE') {
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { quantity: newQuantity } });
    return;
  }

  // États avancés/atypiques (déjà commandé/reçu/en cours/produit) : trop de cas
  // particuliers pour un ajustement sûr par delta → on retombe sur l'ancien
  // comportement (relâcher entièrement, l'appelant reconfirmera après recréation).
  const ADJUSTABLE_PRODUCTION: string[] = ['A_PRODUIRE', 'BLOQUE'];
  const ADJUSTABLE_PURCHASE: string[] = ['A_COMMANDER'];
  const isAdjustable =
    (item.stockPath === 'FROM_STOCK') ||
    (item.stockPath === 'IN_PRODUCTION' && item.productionListItem && ADJUSTABLE_PRODUCTION.includes(item.productionListItem.status)) ||
    (item.stockPath === 'PURCHASE_PENDING' && item.purchaseListItem && ADJUSTABLE_PURCHASE.includes(item.purchaseListItem.status));
  if (!isAdjustable) {
    await releaseOrderItemStock(kind, itemId);
    return;
  }

  if (newQuantity > oldQuantity) {
    const delta = newQuantity - oldQuantity;
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { quantity: newQuantity } });

    if (item.stockPath === 'FROM_STOCK') {
      // Le complément est pris sur le stock dispo si possible, le manquant part
      // en production/achat — même logique que confirmStock, mais pour le delta seul.
      const fromStock = Math.min(item.product.available, delta);
      if (fromStock > 0) {
        await prisma.product.update({ where: { id: item.productId }, data: { available: { decrement: fromStock }, reserved: { increment: fromStock } } });
        await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { resolvedQuantity: { increment: fromStock } } });
      }
      const remainder = delta - fromStock;
      if (remainder > 0) {
        if (item.product.mode === 'ACHETE') {
          const pli = await findOrCreatePurchaseItemForProduct(item.productId, remainder);
          await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'PURCHASE_PENDING', purchaseListItemId: pli.id } });
        } else {
          const pli = await findOrCreateProductionItemForProduct(item.productId, remainder);
          const status = await reserveRawMaterialsForProduction(item.productId, remainder);
          await prisma.productionListItem.update({ where: { id: pli.id }, data: { status } });
          await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'IN_PRODUCTION', productionListItemId: pli.id } });
        }
      }
    } else if (item.stockPath === 'IN_PRODUCTION' && item.productionListItem) {
      // Grossit DIRECTEMENT la ligne déjà liée à cet article (pas de fusion ailleurs).
      const status = await reserveRawMaterialsForProduction(item.productId, delta);
      await prisma.productionListItem.update({
        where: { id: item.productionListItem.id },
        data: { neededQuantity: { increment: delta }, status: status === 'BLOQUE' ? 'BLOQUE' : item.productionListItem.status },
      });
    } else if (item.stockPath === 'PURCHASE_PENDING' && item.purchaseListItem) {
      await prisma.purchaseListItem.update({ where: { id: item.purchaseListItem.id }, data: { neededQuantity: { increment: delta } } });
    }
    return;
  }

  // newQuantity < oldQuantity — réduction
  const delta = oldQuantity - newQuantity;
  const newResolved = Math.min(item.resolvedQuantity, newQuantity);
  const excessResolved = item.resolvedQuantity - newResolved; // portion déjà résolue en trop → redevient disponible
  if (excessResolved > 0) {
    await prisma.product.update({ where: { id: item.productId }, data: { reserved: { decrement: excessResolved }, available: { increment: excessResolved } } });
  }
  await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { quantity: newQuantity, resolvedQuantity: newResolved } });

  const outstandingDelta = delta - excessResolved; // portion encore sur une liste à retirer
  if (outstandingDelta <= 0) return;

  if (item.stockPath === 'IN_PRODUCTION' && item.productionListItem) {
    await releaseRawMaterialsForProduction(item.productId, outstandingDelta);
    const remaining = item.productionListItem.neededQuantity - outstandingDelta;
    if (remaining <= 0) {
      await prisma.productionListItem.delete({ where: { id: item.productionListItem.id } }).catch(() => {});
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { productionListItemId: null } });
    } else {
      await prisma.productionListItem.update({ where: { id: item.productionListItem.id }, data: { neededQuantity: remaining } });
    }
  } else if (item.stockPath === 'PURCHASE_PENDING' && item.purchaseListItem) {
    const remaining = item.purchaseListItem.neededQuantity - outstandingDelta;
    if (remaining <= 0) {
      await prisma.purchaseListItem.delete({ where: { id: item.purchaseListItem.id } }).catch(() => {});
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { purchaseListItemId: null } });
    } else {
      await prisma.purchaseListItem.update({ where: { id: item.purchaseListItem.id }, data: { neededQuantity: remaining } });
    }
  }
}

// Annule le stock de TOUS les articles d'une commande/devis (statut → Annulé)
export async function cancelStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), stockPath: { not: 'NONE' } } });
  for (const item of items) await releaseOrderItemStock(kind, item.id);
}

// ── Étape "Retourné" ─────────────────────────────────────────────────────────
// Le produit livré revient physiquement : passe en `returned`. La remise en
// Disponible se fait manuellement (page Stock → Correction), pas ici.
export async function returnStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), productId: { not: null } } });
  for (const item of items) {
    if (!item.productId || !item.quantity) continue;
    await prisma.product.update({ where: { id: item.productId }, data: { returned: { increment: item.quantity } } });
  }
}

// ── Étape "Livrée" ───────────────────────────────────────────────────────────
// Sortie définitive du stock réservé pour cette commande.
export async function deliverStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), productId: { not: null } } });
  for (const item of items) {
    if (!item.productId || !item.resolvedQuantity) continue;
    await prisma.product.update({ where: { id: item.productId }, data: { reserved: { decrement: item.resolvedQuantity } } });
  }
}

// ── Distribution d'une quantité produite/reçue vers les commandes/devis liés ──
// FIFO par date de création réelle — commandes et devis mélangés dans le même ordre
// chronologique (le plus ancien servi en premier, peu importe si c'est une commande
// ou un devis). La portion effectivement affectée à une commande/devis va dans
// `reserved` (elle lui est réservée) ; le reliquat éventuel (réassort manuel/seuil,
// sans commande liée) va dans `available`.
async function distributeToLinkedItems(
  linkField: 'productionListItemId' | 'purchaseListItemId',
  listItemId: string,
  producedOrReceivedQty: number,
  productId: string,
) {
  let remaining = producedOrReceivedQty;
  // FIFO par date de création RÉELLE de la commande/devis (peu importe lequel des deux) —
  // on va chercher `createdAt` sur le parent (Order/Quote), l'article lui-même n'a pas de date.
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({ where: { [linkField]: listItemId }, include: { order: { select: { createdAt: true } } } }),
    prisma.quoteItem.findMany({ where: { [linkField]: listItemId }, include: { quote: { select: { createdAt: true } } } }),
  ]);
  const linked: { id: string; kind: Kind; parentId: string; quantity: number; resolvedQuantity: number; createdAt: Date }[] = [
    ...orderItems.map((i) => ({ id: i.id, kind: 'order' as Kind, parentId: i.orderId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.order.createdAt })),
    ...quoteItems.map((i) => ({ id: i.id, kind: 'quote' as Kind, parentId: i.quoteId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.quote.createdAt })),
  ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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

// Appelé quand une ligne de production est marquée "fabriquée"
export async function distributeProduction(productionListItemId: string, producedQty: number, productId: string) {
  await distributeToLinkedItems('productionListItemId', productionListItemId, producedQty, productId);
}

// Appelé quand une ligne d'achat est marquée "reçue" (uniquement pour un PRODUIT acheté —
// une matière première reçue n'est jamais réservée à une commande précise : elle sert à
// débloquer la production, cf. unblockProductionForMaterial)
export async function distributePurchase(purchaseListItemId: string, receivedQty: number, productId: string) {
  await distributeToLinkedItems('purchaseListItemId', purchaseListItemId, receivedQty, productId);
}

// ── Étape 3 point 4 : déblocage des lignes de production en attente de matière ─
// À appeler après la réception d'une matière première. Retente une réservation
// pour chaque ligne BLOQUE qui utilise cette matière ; si tout devient disponible,
// la ligne repasse À_PRODUIRE et l'achat correspondant (s'il existait) se réduit.
export async function unblockProductionForMaterial(rawMaterialId: string) {
  const blockedLines = await prisma.productionListItem.findMany({
    where: { status: 'BLOQUE', product: { recipeItems: { some: { rawMaterialId } } } },
    orderBy: { createdAt: 'asc' },
  });

  for (const line of blockedLines) {
    const recipe = await prisma.recipeItem.findMany({ where: { productId: line.productId }, include: { rawMaterial: true } });
    const stillMissing = recipe.some((r) => r.rawMaterial.available < r.quantity * line.neededQuantity);
    if (stillMissing) continue; // pas encore assez pour couvrir toute la ligne

    for (const r of recipe) {
      const needed = r.quantity * line.neededQuantity;
      await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { available: { decrement: needed }, reserved: { increment: needed } } });
      // Réduit/supprime l'éventuelle ligne d'achat de cette matière, désormais couverte.
      const pli = await prisma.purchaseListItem.findFirst({ where: { rawMaterialId: r.rawMaterialId, status: 'A_COMMANDER' } });
      if (pli) {
        const remaining = pli.neededQuantity - needed;
        if (remaining <= 0) await prisma.purchaseListItem.delete({ where: { id: pli.id } }).catch(() => {});
        else await prisma.purchaseListItem.update({ where: { id: pli.id }, data: { neededQuantity: remaining } }).catch(() => {});
      }
    }
    await prisma.productionListItem.update({ where: { id: line.id }, data: { status: 'A_PRODUIRE' } });
  }
}
