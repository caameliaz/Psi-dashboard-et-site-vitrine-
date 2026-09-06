import { prisma } from './prisma';

// ── Réassort préventif par seuil (indépendant des commandes) ───────────────
// Appelé à chaque lecture des listes d'achat/production : ajuste UNIQUEMENT le
// champ `bufferQuantity` de l'unique carte ouverte par produit/matière (jamais
// `neededQuantity`, qui reste la trace du besoin réel — commande ou ajout manuel).
// bufferQuantity vient s'AJOUTER par-dessus neededQuantity (jamais à sa place) :
// ce qui est produit/acheté pour une commande part en `reserved`, jamais en
// `disponible` — donc le rattrapage préventif doit être un besoin séparé, sinon
// le stock disponible ne remonterait jamais au stock max après une commande.
//
// Cible du rattrapage = disponible < seuil ? (stock max − disponible) : 0.
// Recalculé librement (monte, descend, ou la carte disparaît si plus rien n'est
// nécessaire) tant que la ligne n'est pas soldée :
// - Achat : jusqu'à "Reçu" inclus — même après "Commandé", si le stock continue de
//   baisser (nouvelle consommation pendant que la commande fournisseur est en route),
//   le rattrapage remonte sur la MÊME carte plutôt que de rester silencieux jusqu'à
//   la réception. `orderedQuantity` (ce qui a été réellement commandé) n'est jamais
//   modifié par la synchro, seul `bufferQuantity` bouge.
// - Production : jusqu'à ce que la ligne soit produite en totalité (statut "Produit").

import { OPEN_PURCHASE_STATUSES, resyncProductionBufferForProduct, resyncPurchaseBuffer } from './order-stock';

export async function syncPurchaseList() {
  const [products, materials, openItems] = await Promise.all([
    prisma.product.findMany({ where: { active: true, mode: { in: ['ACHETE', 'LES_DEUX'] } } }),
    prisma.rawMaterial.findMany(),
    // A_COMMANDER + COMMANDE = carte encore ouverte (une seule par produit/matière, cf.
    // findOrCreatePurchaseItemFor* et la route POST manuelle). On continue d'ajuster le
    // buffer même une fois "Commandé" : si le stock continue de baisser après la commande
    // fournisseur (nouvelle consommation entre-temps), il faut que ça reste visible au lieu
    // de devenir silencieux jusqu'à la réception — `orderedQuantity`/`neededQuantity` (ce qui
    // a réellement été commandé) ne sont eux jamais touchés ici, seul le rattrapage bouge.
    prisma.purchaseListItem.findMany({ where: { status: { in: [...OPEN_PURCHASE_STATUSES] } } }),
  ]);

  const openByProduct = new Map(openItems.filter((i) => i.productId).map((i) => [i.productId as string, i]));
  const openByMaterial = new Map(openItems.filter((i) => i.rawMaterialId).map((i) => [i.rawMaterialId as string, i]));

  // Même logique de recalcul du buffer, réutilisée ici en masse — cf. order-stock.ts pour le
  // détail (aussi appelée ponctuellement après une annulation).
  for (const p of products) {
    await resyncPurchaseBuffer({ productId: p.id }, openByProduct.get(p.id) ?? null);
  }
  for (const m of materials) {
    await resyncPurchaseBuffer({ rawMaterialId: m.id }, openByMaterial.get(m.id) ?? null);
  }
}

export async function syncProductionList() {
  const [products, openItems] = await Promise.all([
    prisma.product.findMany({ where: { active: true, mode: { in: ['FABRIQUE', 'LES_DEUX'] } } }),
    // A_PRODUIRE / BLOQUE = pas encore actionnée (aucun "Marquer fabriquée" cliqué dessus).
    prisma.productionListItem.findMany({ where: { status: { in: ['A_PRODUIRE', 'BLOQUE'] } } }),
  ]);

  const openByProduct = new Map(openItems.map((i) => [i.productId, i]));

  // Même logique de recalcul du buffer, réutilisée ici en masse pour tous les produits —
  // cf. order-stock.ts pour le détail (aussi appelée ponctuellement après une annulation).
  for (const p of products) {
    await resyncProductionBufferForProduct(p.id, openByProduct.get(p.id) ?? null);
  }
}
