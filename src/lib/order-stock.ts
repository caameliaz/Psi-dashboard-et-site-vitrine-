import { prisma } from './prisma';
import { notifyRollLinkOrderReady } from './rolllink-notify';
import { createNotif } from './notifications';
import type { RequestStatus } from '@prisma/client';

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

// Recette saisie "à la volée" pour une seule action (Produire / Marquer Disponible), quand le
// produit n'a aucune recette enregistrée et que l'utilisateur choisit de ne PAS la sauvegarder
// sur le produit — jamais écrite dans `RecipeItem`, valable uniquement pour cet appel.
export type RecipeOverrideItem = { rawMaterialId: string; quantity: number };

// Remplace entièrement la recette d'un produit et réconcilie chaque matière touchée (ancienne
// ET nouvelle) sur TOUTES les lignes de production qui l'utilisent — factorisé pour être appelé
// aussi bien depuis PUT /api/products/[id]/recipe que depuis les flux "produit sans recette"
// (Produire / Marquer Disponible) quand l'utilisateur choisit d'enregistrer la recette saisie.
export async function saveProductRecipe(productId: string, items: RecipeOverrideItem[]) {
  const oldRecipe = await prisma.recipeItem.findMany({ where: { productId }, select: { rawMaterialId: true } });
  const oldMaterialIds = oldRecipe.map((r) => r.rawMaterialId);

  await prisma.$transaction([
    prisma.recipeItem.deleteMany({ where: { productId } }),
    ...(items.length > 0
      ? [prisma.recipeItem.createMany({ data: items.map((i) => ({ productId, rawMaterialId: i.rawMaterialId, quantity: Number(i.quantity) })) })]
      : []),
  ]);

  const newMaterialIds = items.map((i) => i.rawMaterialId);
  const touchedMaterialIds = new Set([...oldMaterialIds, ...newMaterialIds]);
  for (const rawMaterialId of touchedMaterialIds) await reconcileMaterialAcrossAllLines(rawMaterialId);

  return prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
}

// Équivalent de saveProductRecipe pour une ligne LIBRE (sans fiche produit) — la recette est
// mémorisée sous le texte EXACT de la ligne (`label`, unique), retrouvée automatiquement la
// prochaine fois qu'une ligne libre porte le même texte (cf. getFreeTextRecipe). Pas de
// réconciliation cross-produit ici : une ligne libre n'est jamais partagée/agrégée avec une
// autre, contrairement à un vrai produit.
export async function saveFreeTextRecipe(label: string, items: RecipeOverrideItem[]) {
  const trimmed = label.trim();
  if (!trimmed || items.length === 0) return;
  await prisma.freeTextRecipe.upsert({
    where: { label: trimmed },
    create: { label: trimmed, items: { create: items.map((i) => ({ rawMaterialId: i.rawMaterialId, quantity: Number(i.quantity) })) } },
    update: { items: { deleteMany: {}, create: items.map((i) => ({ rawMaterialId: i.rawMaterialId, quantity: Number(i.quantity) })) } },
  });
}

// Recette déjà enregistrée pour une ligne libre (même texte EXACT), le cas échéant — utilisée
// automatiquement au clic "Produire"/"Marquer Disponible" sans jamais redemander à l'utilisateur
// (même principe qu'une vraie recette de produit).
export async function getFreeTextRecipe(label: string | null): Promise<RecipeWithMaterial[]> {
  if (!label) return [];
  const recipe = await prisma.freeTextRecipe.findUnique({ where: { label: label.trim() }, include: { items: { include: { rawMaterial: true } } } });
  return recipe?.items ?? [];
}

export type MaterialShortfall = { reference: string; name: string; unit: string; missing: number };
type RecipeWithMaterial = { rawMaterialId: string; quantity: number; rawMaterial: { id: string; reference: string; name: string; unit: string; available: number; reserved: number } };

// ── Vérifie puis consomme la matière nécessaire pour produire `qty` unités, à partir de
// `recipe` (recette réelle du produit OU saisie à la volée — cf. RecipeOverrideItem) — utilisée
// aussi bien par le bouton "Produire" (liste de production, tous produits/lignes confondus) que
// par la résolution d'une ligne LIBRE au "Marquer Disponible" (cf. resolveFreeTextItems), pour
// que les deux suivent EXACTEMENT la même logique.
//
// `ownNeededCap` = jusqu'à quelle quantité le besoin déjà reconnu de CETTE ligne (son propre
// `neededQuantity`) peut piocher directement dans le réservé PROPRE de la matière — c'est le cas
// normal d'un vrai produit, dont la matière a déjà été mise de côté pour lui à la confirmation
// (cf. reserveRawMaterialsForProduction). Toujours 0 pour une ligne LIBRE : rien n'a jamais été
// réservé à l'avance pour elle (aucune recette n'existe tant qu'on ne la saisit pas à la volée),
// donc elle ne peut prétendre à AUCUNE part du réservé "à elle" — elle prend sur le disponible
// en priorité, et ne pioche dans le pot commun réservé qu'en tout dernier recours, exactement
// comme un surplus de production sur un vrai produit (cf. §1.4 TESTS-STOCK.md).
//
// Vérification globale D'ABORD (refus net si une seule matière ne suffit pas, rien n'est
// modifié) ; `dryRun` ne fait que ce contrôle, sans jamais rien consommer (pour un aperçu avant
// de bloquer avec un 409).
export async function checkAndConsumeRecipe(
  recipe: RecipeWithMaterial[],
  qty: number,
  ownNeededCap: number,
  dryRun: boolean,
): Promise<{ ok: true; touchedByReserved: Set<string> } | { ok: false; shortfalls: MaterialShortfall[] }> {
  const shortfalls: MaterialShortfall[] = recipe
    .map((r) => {
      const totalNeeded = r.quantity * qty;
      const totalStock = r.rawMaterial.available + r.rawMaterial.reserved;
      return { reference: r.rawMaterial.reference, name: r.rawMaterial.name, unit: r.rawMaterial.unit, missing: totalNeeded - totalStock };
    })
    .filter((s) => s.missing > 0);
  if (shortfalls.length > 0) return { ok: false, shortfalls };
  if (dryRun) return { ok: true, touchedByReserved: new Set() };

  const touchedByReserved = new Set<string>();
  for (const r of recipe) {
    const totalNeeded = r.quantity * qty;
    const ownPortion = r.quantity * Math.min(qty, ownNeededCap);

    const fromReservedOwn = Math.min(ownPortion, r.rawMaterial.reserved);
    const afterOwn = totalNeeded - fromReservedOwn;
    const fromAvailable = Math.min(afterOwn, r.rawMaterial.available);
    const fromReservedExcess = afterOwn - fromAvailable;

    await prisma.rawMaterial.update({
      where: { id: r.rawMaterialId },
      data: { available: { decrement: fromAvailable }, reserved: { decrement: fromReservedOwn + fromReservedExcess } },
    });
    if (fromReservedExcess > 0) touchedByReserved.add(r.rawMaterialId);
  }
  return { ok: true, touchedByReserved };
}

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
// Renvoie les matières PREMIÈRES effectivement touchées (dont `available` vient d'augmenter) —
// à l'appelant de décider s'il doit ensuite proposer ce dispo fraîchement libéré à d'AUTRES
// produits Bloqués partageant la même matière (cf. unblockProductionForMaterial), ce que cette
// fonction ne fait jamais elle-même (elle ne connaît que CE produit).
export async function releaseRawMaterialsForProduction(productId: string, qty: number): Promise<string[]> {
  const recipe = await prisma.recipeItem.findMany({ where: { productId }, include: { rawMaterial: true } });
  const touchedMaterialIds: string[] = [];
  for (const r of recipe) {
    const needed = r.quantity * qty;
    const releasedFromReserved = Math.min(needed, r.rawMaterial.reserved);
    if (releasedFromReserved > 0) {
      await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { reserved: { decrement: releasedFromReserved }, available: { increment: releasedFromReserved } } }).catch(() => {});
      touchedMaterialIds.push(r.rawMaterialId);
    }
  }
  return touchedMaterialIds;
}

// ── Recalcule le besoin réel + buffer d'UNE matière première entièrement à neuf (jamais
// accumulé), à partir de ce que les lignes de production ouvertes réclament réellement.
// besoin réel = Σ (recette × (besoin + buffer de chaque ligne utilisant cette matière)) — le
// buffer d'un produit fabriqué en aval (son propre rattrapage préventif) cascade donc bien
// dans le besoin de la matière : ce n'est pas une commande client, mais tant qu'un produit
// veut se réapprovisionner, la matière qu'il faudrait pour ça doit être visible ici aussi.
// Distingué dans "Commandes concernées" de son PROPRE buffer (cf. materialPurchaseLinks,
// stock-traceability.ts) via un libellé par produit ("Réassort préventif (RÉF produit)").
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

  const existing = await prisma.purchaseListItem.findFirst({ where: { rawMaterialId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });

  const recipeUses = await prisma.recipeItem.findMany({ where: { rawMaterialId }, select: { productId: true, quantity: true } });
  // Le besoin réel des lignes de production + ce qui a été ajouté À LA MAIN (persistant,
  // jamais écrasé — cf. `manualQuantity`) : traité comme du vrai besoin, même logique de
  // couverture.
  let demand = existing?.manualQuantity ?? 0;
  if (recipeUses.length > 0) {
    const ratioByProduct = new Map(recipeUses.map((r) => [r.productId, r.quantity]));
    const lines = await prisma.productionListItem.findMany({
      where: { productId: { in: recipeUses.map((r) => r.productId) }, status: { in: ['A_PRODUIRE', 'BLOQUE'] } },
    });
    for (const line of lines) {
      // `line.productId` est garanti non nul ici : la requête ci-dessus filtre déjà sur des
      // productId réels (ceux de `recipeUses`) — une ligne libre n'y correspond jamais.
      demand += (ratioByProduct.get(line.productId!) ?? 0) * (line.neededQuantity + line.bufferQuantity);
    }
  }
  const bufferTarget = material.available < material.purchaseThreshold ? Math.max(0, material.stockMax - material.available) : 0;

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
    // `auto` (pur rattrapage préventif, sans aucune vraie commande derrière) doit être
    // reclassé à chaque appel comme le reste — sinon une ligne créée avec un vrai besoin
    // (auto=false) qui retombe plus tard à du buffer pur reste étiquetée "Ajouté
    // manuellement" pour toujours à l'affichage (cf. severitySubtitle, StockListsWidget.tsx).
    const auto = realNeeded === 0;
    if (existing.neededQuantity === realNeeded && existing.bufferQuantity === bufferNeeded && existing.auto === auto) return;
    await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: realNeeded, bufferQuantity: bufferNeeded, auto } }).catch(() => {});
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
export async function isProductionBlocked(productId: string, realNeeded: number): Promise<boolean> {
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

  const existing = await prisma.productionListItem.findFirst({ where: { productId, status: { in: ['A_PRODUIRE', 'BLOQUE'] } } });
  // Le besoin réel des commandes + ce qui a été ajouté À LA MAIN (persistant, jamais écrasé —
  // cf. `manualQuantity`) : traité comme du vrai besoin, soumis à la même logique de réservation.
  const realNeeded = (await realProductionNeed(productId)) + (existing?.manualQuantity ?? 0);
  const target = product.available < product.productionThreshold ? Math.max(0, product.stockMax - product.available) : 0;

  try {
    if (existing) {
      const deltaNeeded = realNeeded - existing.neededQuantity;
      const deltaBuffer = target - existing.bufferQuantity;
      // `auto` (pur rattrapage préventif, sans aucune vraie commande derrière) doit être
      // reclassé à chaque appel comme le besoin/buffer — sinon une ligne créée avec un vrai
      // besoin (auto=false) qui retombe plus tard à du buffer pur reste étiquetée "Ajouté
      // manuellement" pour toujours à l'affichage (cf. severitySubtitle, StockListsWidget.tsx).
      const auto = realNeeded === 0;
      if (deltaNeeded === 0 && deltaBuffer === 0 && existing.auto === auto) return existing;

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
        data: { neededQuantity: realNeeded, bufferQuantity: target, status: blockedByDelta ? 'BLOQUE' : 'A_PRODUIRE', auto },
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

  const existing = await prisma.purchaseListItem.findFirst({ where: { productId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });
  // Le besoin réel des commandes + ce qui a été ajouté À LA MAIN (persistant, jamais écrasé —
  // cf. `manualQuantity`) : traité comme du vrai besoin, soumis à la même logique de couverture.
  const demand = (await realPurchaseNeed(productId)) + (existing?.manualQuantity ?? 0);
  const target = product.available < product.purchaseThreshold ? Math.max(0, product.stockMax - product.available) : 0;
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
    // `auto` reclassé à chaque appel comme le reste (cf. resyncMaterialPurchaseNeed) — sinon
    // une ligne créée avec un vrai besoin reste étiquetée "Ajouté manuellement" pour toujours
    // même une fois retombée à du pur rattrapage préventif.
    const auto = realNeeded === 0;
    if (existing.neededQuantity === realNeeded && existing.bufferQuantity === bufferNeeded && existing.auto === auto) return existing;
    return await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: realNeeded, bufferQuantity: bufferNeeded, auto } });
  }
  if (realNeeded > 0 || bufferNeeded > 0) {
    return await prisma.purchaseListItem.create({ data: { productId, neededQuantity: realNeeded, bufferQuantity: bufferNeeded, auto: realNeeded === 0 } });
  }
  return null;
}

// ── Auto-attribution au commercial (case à cocher "Pris en charge par", RequestPanel) ───────
// Synchronise l'attribution automatique au commercial d'UN article avec son `resolvedQuantity`
// réel — dès que du stock est réservé pour cette commande/devis (resolvedQuantity augmente),
// la même quantité est créditée dans StockAssignment pour l'employé "Pris en charge par" ;
// si elle baisse (annulation, vol par une autre commande, reprise de couverture...), le crédit
// est repris symétriquement. Pure couche de bookkeeping PAR-DESSUS reserved/available, qui ne
// les modifie JAMAIS elle-même (aucun changement à la logique reserved/available existante) —
// à appeler après CHAQUE écriture de `resolvedQuantity` sur un article produit.
//
// Simplification volontaire sur la réassignation : le commercial est VERROUILLÉ sur l'article
// dès son premier crédit (`assignedEmployeeId`, figé) — un changement de "Pris en charge par"
// après coup ne redirige JAMAIS ce qui est déjà (ou sera encore) auto-attribué pour CET
// article ; il faut décocher/recocher la case pour reverrouiller sur le nouvel employé. Sans
// ça, un changement d'assignation en cours de route redonnerait à tort le même stock déjà
// crédité à l'ancien commercial une seconde fois au nouveau (double comptage).
export async function syncCommercialAssignment(kind: Kind, itemId: string) {
  const item = await (itemDelegate(kind) as any).findUnique({ where: { id: itemId } });
  if (!item || !item.productId) return;

  const parent = await (parentDelegate(kind) as any).findUnique({
    where: { id: kind === 'order' ? item.orderId : item.quoteId },
    select: { autoAssignStock: true, assignedToId: true },
  });
  if (!parent) return;

  const employeeId: string | null = item.assignedEmployeeId ?? parent.assignedToId ?? null;
  const target = parent.autoAssignStock && employeeId ? item.resolvedQuantity : 0;
  const delta = target - item.assignedQuantity;
  if (delta === 0) return;

  if (delta > 0 && employeeId) {
    const existing = await prisma.stockAssignment.findFirst({ where: { employeeId, productId: item.productId } });
    await (existing
      ? prisma.stockAssignment.update({ where: { id: existing.id }, data: { quantity: { increment: delta } } })
      : prisma.stockAssignment.create({ data: { employeeId, productId: item.productId, quantity: delta } }));
  } else if (delta < 0 && item.assignedEmployeeId) {
    const existing = await prisma.stockAssignment.findFirst({ where: { employeeId: item.assignedEmployeeId, productId: item.productId } });
    if (existing) {
      const take = Math.min(-delta, existing.quantity);
      const remaining = existing.quantity - take;
      await (remaining <= 0
        ? prisma.stockAssignment.delete({ where: { id: existing.id } })
        : prisma.stockAssignment.update({ where: { id: existing.id }, data: { quantity: remaining } }));
    }
  }

  await (itemDelegate(kind) as any).update({
    where: { id: item.id },
    data: { assignedQuantity: Math.max(0, target), assignedEmployeeId: target > 0 ? employeeId : null },
  });
}

// Réapplique syncCommercialAssignment à TOUS les articles produit d'une commande/devis — à
// appeler quand `autoAssignStock` lui-même change (cocher/décocher la case), puisque le
// `resolvedQuantity` de ses articles ne bouge pas mais la cible, elle, change instantanément.
export async function syncCommercialAssignmentForParent(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), productId: { not: null } }, select: { id: true } });
  for (const item of items) await syncCommercialAssignment(kind, item.id);
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
      await syncCommercialAssignment(kind, item.id);
      continue;
    }

    if (product.mode === 'ACHETE') {
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'PURCHASE_PENDING', resolvedQuantity: fromStock } });
      await syncCommercialAssignment(kind, item.id);
      const line = await resyncPurchaseLineForProduct(product.id);
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { purchaseListItemId: line?.id ?? null } });
      continue;
    }

    // 2. Le manquant sur un produit fabriqué → liste de production, matière réservée si dispo.
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'IN_PRODUCTION', resolvedQuantity: fromStock } });
    await syncCommercialAssignment(kind, item.id);
    const line = await resyncProductionLine(product.id);
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { productionListItemId: line?.id ?? null } });
  }

  // ── Lignes LIBRES (texte tapé à la main, sans fiche produit) ────────────────────────────
  // Jamais de disponible/réservé à vérifier (rien n'existe pour elles) : toute la quantité part
  // directement en production, sur une ligne dédiée et jamais partagée avec une autre commande
  // (contrairement à un vrai produit, dont la ligne de production agrège plusieurs commandes) —
  // cf. resyncFreeTextProductionLine, previewFreeTextResolution/resolveFreeTextItems (§ "Marquer
  // Disponible") et PATCH /api/production-list/[id] (bouton "Produire").
  const freeTextItems = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: 'NONE', productId: null },
  });
  for (const item of freeTextItems) {
    if (!item.description || item.quantity <= 0) continue;
    const line = await prisma.productionListItem.create({
      data: { productId: null, description: item.description, neededQuantity: item.quantity, status: 'A_PRODUIRE', auto: false },
    });
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'IN_PRODUCTION', productionListItemId: line.id } });
  }

  // Notifie (in-app + push) admins + commercial assigné si du stock manque encore à ce stade
  // (achat/production en cours) — événement automatique (pas une action manuelle de qqn de
  // précis), donc une VRAIE notif plutôt qu'un simple toast (cf. discussion 16/09).
  const stillMissing = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: { in: ['PURCHASE_PENDING', 'IN_PRODUCTION'] } },
    include: { product: true },
  });
  if (stillMissing.length > 0) {
    const parentForNotif = await (parentDelegate(kind) as any).findUnique({ where: { id: parentId }, select: { ref: true, assignedToId: true, clientName: true, clientCompany: true } });
    if (parentForNotif) {
      const clientLabel = parentForNotif.clientCompany ?? parentForNotif.clientName ?? '—';
      const entityLabel = kind === 'order' ? 'La commande' : 'Le devis';
      createNotif({
        type: 'ACTION_AUTRE',
        title: kind === 'order' ? 'Commande en attente de stock' : 'Devis en attente de stock',
        message: `${entityLabel} de ${clientLabel} (${parentForNotif.ref ?? parentId.slice(0, 8).toUpperCase()}) reste en attente : ${stillMissing.length} article(s) pas encore disponible(s) (achat/production en cours).`,
        assignedToId: parentForNotif.assignedToId,
        orderId: kind === 'order' ? parentId : undefined,
        quoteId: kind === 'quote' ? parentId : undefined,
      }).catch(() => {});
    }
  }

  await checkCompletion(kind, parentId);
}

// ── Équivalent de resyncProductionLine, pour une ligne LIBRE ────────────────────────────────
// Contrairement à un vrai produit (besoin agrégé de plusieurs commandes, buffer, seuil), une
// ligne libre est TOUJOURS liée à un seul article (jamais partagée) : son besoin réel est donc
// juste "quantité de cet article moins ce qui est déjà résolu" — pas de buffer (rien à
// réassortir pour quelque chose qui n'existe qu'une fois), jamais de statut "Bloqué" (le refus
// se fait directement au clic "Produire"/"Marquer Disponible", cf. checkAndConsumeRecipe).
export async function resyncFreeTextProductionLine(productionListItemId: string) {
  const line = await prisma.productionListItem.findUnique({ where: { id: productionListItemId } });
  if (!line || line.productId) return; // garde-fou : jamais appelée sur la ligne d'un vrai produit

  const [orderItem, quoteItem] = await Promise.all([
    prisma.orderItem.findFirst({ where: { productionListItemId } }),
    prisma.quoteItem.findFirst({ where: { productionListItemId } }),
  ]);
  const linked = orderItem ?? quoteItem;
  const realNeeded = linked ? Math.max(0, linked.quantity - linked.resolvedQuantity) : 0;

  if (realNeeded === 0) {
    // Une ligne qui a réellement produit quelque chose garde une trace (statut "Produit") ;
    // sinon (jamais touchée) elle disparaît simplement — même règle que resyncProductionLine.
    if (line.producedQuantity > 0) {
      await prisma.productionListItem.update({ where: { id: line.id }, data: { neededQuantity: 0, status: 'PRODUIT' } });
    } else {
      await prisma.productionListItem.delete({ where: { id: line.id } }).catch(() => {});
    }
    return;
  }
  if (line.neededQuantity !== realNeeded) {
    await prisma.productionListItem.update({ where: { id: line.id }, data: { neededQuantity: realNeeded } });
  }
}

// Les lignes LIBRES (sans fiche produit) encore à résoudre d'une commande/d'un devis — jamais
// partagées entre commandes (contrairement à un vrai produit), une seule ligne = un seul article.
async function openFreeTextItems(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: 'IN_PRODUCTION', productId: null },
  });
  return (items as any[]).filter((i) => i.quantity - i.resolvedQuantity > 0);
}

export type FreeTextShortfall = { itemId: string; label: string; missing: number };
// `force` : l'utilisateur a choisi "Mettre disponible malgré le manque" — marque résolu SANS
// rien consommer (écart assumé, jamais de stock fictif inventé), exactement comme un manquant
// produit forcé (cf. forceCompleteOrder). "Marquer Disponible" ne fabrique JAMAIS (ni recette ni
// matière première n'entrent en jeu ici — seul le bouton "Produire" fabrique réellement) : une
// ligne libre n'a ni disponible ni réservé à réallouer, donc soit elle est déjà résolue, soit
// c'est un manquant net, réglable uniquement en forçant.
export type FreeTextOpts = { force?: boolean };

// ── "Marquer Disponible" pour les lignes LIBRES — jamais de fabrication ici (cf. FreeTextOpts) :
// juste un manquant nu, forçable ou non.
export async function previewFreeTextResolution(kind: Kind, parentId: string): Promise<{ shortfalls: FreeTextShortfall[] }> {
  const items = await openFreeTextItems(kind, parentId);
  const shortfalls: FreeTextShortfall[] = items.map((item) => ({
    itemId: item.id, label: item.description ?? 'Ligne libre', missing: item.quantity - item.resolvedQuantity,
  }));
  return { shortfalls };
}

// Contrepartie qui applique réellement la résolution — seulement en mode `force` (sinon rien à
// faire, cf. preview ci-dessus) : marque chaque ligne libre encore ouverte résolue SANS toucher
// au stock matière (écart assumé).
export async function resolveFreeTextItems(kind: Kind, parentId: string, opts?: FreeTextOpts) {
  if (!opts?.force) return;
  const items = await openFreeTextItems(kind, parentId);

  for (const item of items) {
    const remaining = item.quantity - item.resolvedQuantity;
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { resolvedQuantity: { increment: remaining } } });
    if (item.productionListItemId) {
      await prisma.productionListItem.update({ where: { id: item.productionListItemId }, data: { producedQuantity: { increment: remaining } } });
      await resyncFreeTextProductionLine(item.productionListItemId);
    }
  }
}

// ── Vérifie si tous les articles sont résolus → passe la commande en PRODUITE ─
export async function checkCompletion(kind: Kind, parentId: string) {
  const parent = await (parentDelegate(kind) as any).findUnique({ where: { id: parentId }, select: { status: true, source: true, ref: true, assignedToId: true, clientName: true, clientCompany: true } });
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

  // Transition AUTOMATIQUE (personne n'a cliqué "Marquer Disponible" ici) → notif (in-app +
  // push) admins + commercial assigné, plutôt qu'un toast (qui ne toucherait que la personne
  // ayant l'écran ouvert au moment précis où ça se déclenche — souvent personne).
  const clientLabel = parent.clientCompany ?? parent.clientName ?? '—';
  createNotif({
    type: 'ACTION_AUTRE',
    title: kind === 'order' ? 'Commande disponible' : 'Devis disponible',
    message: `${kind === 'order' ? 'La commande' : 'Le devis'} de ${clientLabel} (${parent.ref ?? parentId.slice(0, 8).toUpperCase()}) est maintenant disponible — tout le stock nécessaire est réuni.`,
    assignedToId: parent.assignedToId,
    orderId: kind === 'order' ? parentId : undefined,
    quoteId: kind === 'quote' ? parentId : undefined,
  }).catch(() => {});

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
//   2. Ce qui est `reserved` chez N'IMPORTE QUELLE AUTRE commande/devis active sur ce même
//      produit — "Confirmée" (même pas encore produite, juste partiellement résolue via le
//      disponible) OU déjà "Produite" — peu importe, on le lui reprend (la plus RÉCEMMENT
//      créée en premier). Si elle n'a plus rien après ça, son manquant réapparaît normalement
//      (repasse "Confirmée" si elle était "Produite").
//   3. (Fabriqués seulement) fabrication immédiate en consommant la matière première déjà
//      réservée pour cette ligne — dans la limite de ce que la recette permet vraiment.
// S'il reste un manquant après ces 3 étapes → BLOCAGE DUR (rien n'est modifié pour AUCUN
// article de la commande, tout ou rien) : le manquant est renvoyé par produit.

export type ProductShortfall = { productId: string; reference: string; name: string | null; missing: number };

// Statuts éligibles comme "donneur" pour "Marquer Produit" : n'importe quelle commande/devis
// encore active avec du réservé sur ce produit, peu importe si elle est déjà "Produite" ou
// simplement "Confirmée" (partiellement résolue).
const FORCE_COMPLETE_DONOR_STATUSES: RequestStatus[] = ['VALIDE', 'PRODUITE'];

// Candidats "donneurs" pour un produit : commandes/devis (parmi `donorStatuses`, autres que la
// commande/devis en cours) qui ont déjà du réservé sur ce produit, triés du plus RÉCEMMENT créé
// au plus ancien.
async function findDonorItems(productId: string, excludeKind: Kind, excludeParentId: string, donorStatuses: RequestStatus[]) {
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, order: { status: { in: donorStatuses } }, NOT: excludeKind === 'order' ? { orderId: excludeParentId } : undefined },
      include: { order: { select: { createdAt: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, quote: { status: { in: donorStatuses } }, NOT: excludeKind === 'quote' ? { quoteId: excludeParentId } : undefined },
      include: { quote: { select: { createdAt: true } } },
    }),
  ]);
  return [
    ...orderItems.map((i) => ({ id: i.id, kind: 'order' as Kind, parentId: i.orderId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.order.createdAt })),
    ...quoteItems.map((i) => ({ id: i.id, kind: 'quote' as Kind, parentId: i.quoteId, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.quote.createdAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export type ForceCompleteOpts = { force?: boolean };

// Simule (sans RIEN modifier) le plan de résolution complet ci-dessous pour chaque article
// encore ouvert. Retourne le manquant final par produit (vide = tout est réalisable). "Marquer
// Disponible" ne fabrique JAMAIS (ni recette ni matière première n'entrent en jeu) — seulement
// une réallocation de stock produit déjà existant (disponible + vol chez une autre commande) ;
// seul le bouton "Produire" (liste de production) fabrique réellement.
export async function previewForceCompleteShortfall(kind: Kind, parentId: string): Promise<{ shortfalls: ProductShortfall[] }> {
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
      const donors = await findDonorItems(item.productId, kind, parentId, FORCE_COMPLETE_DONOR_STATUSES);
      for (const d of donors) {
        if (remaining <= 0) break;
        remaining -= Math.min(remaining, d.resolvedQuantity);
      }
    }

    if (remaining > 0) {
      shortfalls.push({ productId: item.productId, reference: item.product.reference, name: item.product.name, missing: remaining });
    }
  }
  return { shortfalls };
}

// `opts.force` : accepte l'écart quand le manquant persiste même après les 2 étapes ci-dessous
// (disponible → vol chez un donneur) — l'utilisateur a explicitement choisi de continuer malgré
// l'alerte de manquant (cf. route.ts, PRODUCT_SHORTFALL). La part non couverte est marquée
// résolue SANS toucher au stock produit fini pour elle : on ne réserve/décrémente jamais que ce
// qui existe vraiment (fromAvailable) — l'écart reste un manquant assumé (visible en audit),
// jamais un stock fictif inventé. Aucune fabrication ici (cf. previewForceCompleteShortfall).
export async function forceCompleteOrder(kind: Kind, parentId: string, opts?: ForceCompleteOpts): Promise<{ productId: string; reference: string; missing: number }[]> {
  const items = await (itemDelegate(kind) as any).findMany({
    where: { ...itemWhereParent(kind, parentId), stockPath: { in: ['IN_PRODUCTION', 'PURCHASE_PENDING'] } },
    include: { product: true },
  });

  const touchedProducts = new Set<string>();
  const phantomShortfalls: { productId: string; reference: string; missing: number }[] = [];

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
      const donors = await findDonorItems(item.productId, kind, parentId, FORCE_COMPLETE_DONOR_STATUSES);
      for (const d of donors) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, d.resolvedQuantity);
        if (take <= 0) continue;
        remaining -= take;
        donorSteals.push({ id: d.id, kind: d.kind, parentId: d.parentId, quantity: d.quantity, newResolved: d.resolvedQuantity - take, amount: take });
      }
    }

    // Le préview vient d'être revérifié juste avant l'appel (côté route) — `remaining` doit
    // être à 0 ici sauf en mode `force` (l'utilisateur a explicitement choisi de continuer
    // malgré le manquant) ; par sécurité on ne dépasse jamais ce qui a été validé sinon. Jamais
    // de fabrication ici (cf. commentaire en tête de fonction) : le manquant persistant ne peut
    // être résolu que par ce que le disponible + le vol chez un donneur ont déjà donné.
    if (remaining > 0) {
      if (!opts?.force) continue;
      phantomShortfalls.push({ productId: item.productId, reference: item.product.reference, missing: remaining });
    }

    // Applique les vols chez les commandes/devis "Produite" (chacune repasse "Confirmée").
    // Le chemin de stock est remis sur IN_PRODUCTION/PURCHASE_PENDING selon le mode du produit
    // — sinon un article resté à FROM_STOCK (ce qu'il était probablement, ayant été comblé
    // directement à sa confirmation) ne réapparaît JAMAIS dans le besoin dérivé, et son
    // manquant se perdrait silencieusement, invisible partout.
    const donorStockPath = item.product.mode === 'ACHETE' ? 'PURCHASE_PENDING' : 'IN_PRODUCTION';
    for (const steal of donorSteals) {
      const stillOpen = steal.newResolved < steal.quantity;
      await (itemDelegate(steal.kind) as any).update({
        where: { id: steal.id },
        data: {
          resolvedQuantity: steal.newResolved,
          ...(stillOpen && { stockPath: donorStockPath, productionListItemId: null, purchaseListItemId: null }),
        },
      });
      await syncCommercialAssignment(steal.kind, steal.id);
      if (stillOpen) {
        await (parentDelegate(steal.kind) as any).update({ where: { id: steal.parentId }, data: { status: 'VALIDE' } });
      }
    }

    const newlyReserved = fromAvailable; // le vol chez un donneur ne change pas le total réservé
    if (fromAvailable > 0) {
      await prisma.product.update({ where: { id: item.productId }, data: { available: { decrement: fromAvailable } } });
    }
    if (newlyReserved > 0) {
      await prisma.product.update({ where: { id: item.productId }, data: { reserved: { increment: newlyReserved } } });
    }
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { resolvedQuantity: item.quantity } });
    await syncCommercialAssignment(kind, item.id);
    touchedProducts.add(item.productId);
  }

  for (const productId of touchedProducts) {
    await resyncAndRelink(productId);
  }
  return phantomShortfalls;
}

// Recalcule les lignes de production/achat d'un produit puis relie les articles rouverts
// (ex: un donneur qui vient de perdre sa couverture) à la ligne fraîchement recalculée —
// factorisé car utilisé par plusieurs actions (vol chez un donneur, reprise de couverture...).
async function resyncAndRelink(productId: string) {
  await resyncProductionLine(productId);
  await resyncPurchaseLineForProduct(productId);
  const prodLine = await prisma.productionListItem.findFirst({ where: { productId, status: { in: ['A_PRODUIRE', 'BLOQUE'] } } });
  await prisma.orderItem.updateMany({ where: { productId, stockPath: 'IN_PRODUCTION', productionListItemId: null }, data: { productionListItemId: prodLine?.id ?? null } });
  await prisma.quoteItem.updateMany({ where: { productId, stockPath: 'IN_PRODUCTION', productionListItemId: null }, data: { productionListItemId: prodLine?.id ?? null } });
  const purchLine = await prisma.purchaseListItem.findFirst({ where: { productId, status: { in: [...OPEN_PURCHASE_STATUSES] } } });
  await prisma.orderItem.updateMany({ where: { productId, stockPath: 'PURCHASE_PENDING', purchaseListItemId: null }, data: { purchaseListItemId: purchLine?.id ?? null } });
  await prisma.quoteItem.updateMany({ where: { productId, stockPath: 'PURCHASE_PENDING', purchaseListItemId: null }, data: { purchaseListItemId: purchLine?.id ?? null } });
}


// ── Étape 8 (Annulée) / Étape 5 (retrait d'article sur commande confirmée) ──
// Annule l'effet stock d'UN article déjà engagé (utilisé pour l'annulation
// complète de la commande, ou le retrait d'une ligne lors d'une modification).
export async function releaseOrderItemStock(kind: Kind, itemId: string) {
  const item = await (itemDelegate(kind) as any).findUnique({ where: { id: itemId }, include: { product: true } });
  if (!item || item.stockPath === 'NONE') return;

  // Ligne LIBRE (sans fiche produit) : rien à relâcher sur un produit (n'existe pas). Toute
  // matière déjà consommée pour elle (recette saisie à la volée) est définitivement perdue —
  // une fabrication n'est jamais annulable a posteriori, même règle qu'un vrai produit (cf. §13
  // TESTS-STOCK.md). Sa ligne de production, jamais partagée avec une autre commande, est
  // supprimée directement (jamais réutilisable).
  if (!item.productId) {
    await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'NONE', resolvedQuantity: 0, productionListItemId: null } });
    if (item.productionListItemId) {
      await prisma.productionListItem.delete({ where: { id: item.productionListItemId } }).catch(() => {});
    }
    return;
  }

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
    // Cette matière libérée peut débloquer un AUTRE produit qui la partage et attendait —
    // sinon il resterait Bloqué jusqu'au prochain évènement qui touche cette matière.
    const releasedMaterialIds = await releaseRawMaterialsForProduction(item.productId!, stillNeeded);
    for (const rawMaterialId of releasedMaterialIds) await unblockProductionForMaterial(rawMaterialId);
  }

  // On marque l'article NONE AVANT de recalculer — sinon il compterait encore dans son propre
  // besoin dérivé (la requête de resyncProductionLine/resyncPurchaseLineForProduct ne regarde
  // que les articles encore IN_PRODUCTION/PURCHASE_PENDING).
  const wasProduction = item.stockPath === 'IN_PRODUCTION';
  const wasPurchase = item.stockPath === 'PURCHASE_PENDING';
  await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { stockPath: 'NONE', resolvedQuantity: 0, purchaseListItemId: null, productionListItemId: null } });
  await syncCommercialAssignment(kind, item.id);

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
    await syncCommercialAssignment(it.kind, it.id);

    if (it.stockPath === 'IN_PRODUCTION') {
      // Cette part ne sera plus fabriquée (satisfaite directement par le stock) → la matière
      // première qui lui était réservée n'est plus nécessaire, on la relâche — et on la
      // propose à d'AUTRES produits Bloqués qui la partagent, sinon elle resterait invisible
      // pour eux jusqu'au prochain évènement qui touche cette matière.
      const releasedMaterialIds = await releaseRawMaterialsForProduction(productId, take);
      for (const rawMaterialId of releasedMaterialIds) await unblockProductionForMaterial(rawMaterialId);
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
      include: { order: { select: { id: true, createdAt: true, priority: true, status: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productId, resolvedQuantity: { gt: 0 }, quote: { status: { in: ['VALIDE', 'PRODUITE'] } } },
      include: { quote: { select: { id: true, createdAt: true, priority: true, status: true } } },
    }),
  ]);

  const claims = [
    ...orderItems.map((i) => ({ id: i.id, kind: 'order' as Kind, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.order.createdAt, priority: i.order.priority, parentId: i.order.id, parentStatus: i.order.status })),
    ...quoteItems.map((i) => ({ id: i.id, kind: 'quote' as Kind, quantity: i.quantity, resolvedQuantity: i.resolvedQuantity, createdAt: i.quote.createdAt, priority: i.quote.priority, parentId: i.quote.id, parentStatus: i.quote.status })),
  ].sort(fifoCompare);

  let poolLeft = product.reserved;
  let touchedAny = false;
  const newStockPath = product.mode === 'ACHETE' ? 'PURCHASE_PENDING' : 'IN_PRODUCTION';
  // Commande/devis redescendues de "Produite" à "Confirmée" parce qu'elles viennent de perdre
  // de la couverture ci-dessous — jamais l'inverse (checkCompletion ne fait remonter que si
  // TOUS les articles sont de nouveau résolus, appelé séparément ailleurs).
  const reopenedParents = new Set<string>();

  for (const claim of claims) {
    if (poolLeft >= claim.resolvedQuantity) {
      poolLeft -= claim.resolvedQuantity;
      continue;
    }
    const covered = Math.max(0, poolLeft);
    const takeBack = claim.resolvedQuantity - covered;
    poolLeft = 0;
    if (takeBack <= 0) continue;

    const newResolved = claim.resolvedQuantity - takeBack;
    await (itemDelegate(claim.kind) as any).update({
      where: { id: claim.id },
      data: { resolvedQuantity: newResolved, stockPath: newStockPath },
    });
    await syncCommercialAssignment(claim.kind, claim.id);
    touchedAny = true;

    // La commande/devis perd sa couverture complète (son manquant réapparaît) alors qu'elle
    // était déjà "Produite" → redescend "Confirmée", sinon elle resterait affichée Disponible
    // tout en ayant du stock manquant (cf. forceCompleteOrder, même règle pour le vol de donneur).
    if (claim.parentStatus === 'PRODUITE' && newResolved < claim.quantity) {
      reopenedParents.add(`${claim.kind}:${claim.parentId}`);
    }
  }

  for (const key of reopenedParents) {
    const [kind, parentId] = key.split(':') as [Kind, string];
    await (parentDelegate(kind) as any).update({ where: { id: parentId }, data: { status: 'VALIDE' } });
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
  await syncCommercialAssignment(kind, item.id);

  if (excessResolved > 0) {
    // Le disponible vient d'augmenter → le proposer EN PRIORITÉ aux autres commandes/devis
    // déjà en attente sur ce même produit (FIFO), avant de laisser le reliquat compter comme
    // simple buffer — même logique que releaseOrderItemStock, la correction de stock ou le
    // restock. Sans cet appel, ce disponible restait "libre" au lieu d'être proposé à la plus
    // ancienne commande en attente (trou trouvé en testant "Marquer Produit").
    await reallocateAvailableStock(item.productId);
  }

  if (item.stockPath === 'FROM_STOCK' && newQuantity > oldQuantity) {
    // Le complément est pris sur le stock dispo si possible, le manquant part en production/achat.
    const delta = newQuantity - oldQuantity;
    const fromStock = Math.min(item.product.available, delta);
    if (fromStock > 0) {
      await prisma.product.update({ where: { id: item.productId }, data: { available: { decrement: fromStock }, reserved: { increment: fromStock } } });
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { resolvedQuantity: { increment: fromStock } } });
      await syncCommercialAssignment(kind, item.id);
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
      if (outstandingDelta > 0) {
        const releasedMaterialIds = await releaseRawMaterialsForProduction(item.productId, outstandingDelta);
        for (const rawMaterialId of releasedMaterialIds) await unblockProductionForMaterial(rawMaterialId);
      }
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
// `reserved` baisse du plein montant comme avant (logique reserved/available INCHANGÉE). En
// plus (bookkeeping séparé) : le stock livré quitte aussi le pot du commercial verrouillé pour
// cet article (StockAssignment), dans la limite de ce qu'il y détient — jamais le stock hors
// commerciaux (entrepôt, `available`) : `reserved` vient déjà de baisser du plein montant,
// donc si le commercial n'en avait pas assez pour couvrir toute la livraison, la formule
// (available + reserved − attribué) absorbe NATURELLEMENT la différence côté entrepôt — inutile
// (et faux) de retoucher `available` ici pour ça.
export async function deliverStock(kind: Kind, parentId: string) {
  const items = await (itemDelegate(kind) as any).findMany({ where: { ...itemWhereParent(kind, parentId), productId: { not: null } } });
  for (const item of items) {
    if (!item.productId || !item.resolvedQuantity) continue;
    await prisma.product.update({ where: { id: item.productId }, data: { reserved: { decrement: item.resolvedQuantity } } });

    if (item.assignedEmployeeId) {
      const assignment = await prisma.stockAssignment.findFirst({ where: { employeeId: item.assignedEmployeeId, productId: item.productId } });
      if (assignment) {
        const take = Math.min(item.resolvedQuantity, assignment.quantity);
        if (take > 0) {
          const remaining = assignment.quantity - take;
          await (remaining <= 0
            ? prisma.stockAssignment.delete({ where: { id: assignment.id } })
            : prisma.stockAssignment.update({ where: { id: assignment.id }, data: { quantity: remaining } }));
        }
      }
      // Le crédit vient d'être consommé par la livraison — rien à "reprendre" en le décochant.
      await (itemDelegate(kind) as any).update({ where: { id: item.id }, data: { assignedQuantity: 0, assignedEmployeeId: null } });
    }
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
    await syncCommercialAssignment(li.kind, li.id);
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

// Clé FIFO d'UNE ligne de production, pour la comparer à des lignes d'AUTRES PRODUITS sur une
// même matière (cf. unblockProductionForMaterial/reassessProductionForMaterial ci-dessous) :
// la commande/devis la plus prioritaire au sens `fifoCompare` (priorité d'abord, puis la plus
// ancienne) PARMI CELLES qui ont encore un besoin réel dessus — jamais la date de création de
// la ligne elle-même. Cette date peut diverger de la vraie commande la plus ancienne encore en
// attente (ex: ligne supprimée puis recréée après un passage à 0 besoin, elle "renaît" avec une
// date fraîche alors que la commande qui la fait renaître peut être ancienne) — sans ça, une
// commande récente profiterait à tort de l'ancienneté du PRODUIT plutôt que de la sienne.
// Repli sur la date de création de la ligne si elle n'a aucune commande/devis avec un besoin
// restant (ex: pur besoin ajouté à la main, sans commande liée).
async function productionLineFifoKey(line: { id: string; createdAt: Date }): Promise<{ priority: boolean; createdAt: Date }> {
  const [orderItems, quoteItems] = await Promise.all([
    prisma.orderItem.findMany({
      where: { productionListItemId: line.id },
      select: { quantity: true, resolvedQuantity: true, order: { select: { createdAt: true, priority: true } } },
    }),
    prisma.quoteItem.findMany({
      where: { productionListItemId: line.id },
      select: { quantity: true, resolvedQuantity: true, quote: { select: { createdAt: true, priority: true } } },
    }),
  ]);
  const claims = [
    ...orderItems.filter((i) => i.quantity > i.resolvedQuantity).map((i) => ({ priority: i.order.priority, createdAt: i.order.createdAt })),
    ...quoteItems.filter((i) => i.quantity > i.resolvedQuantity).map((i) => ({ priority: i.quote.priority, createdAt: i.quote.createdAt })),
  ].sort(fifoCompare);
  return claims[0] ?? { priority: false, createdAt: line.createdAt };
}

// Trie des lignes de production ENTRE ELLES (produits potentiellement différents) par leur
// productionLineFifoKey — factorisé, utilisé par unblockProductionForMaterial et
// reassessProductionForMaterial.
export async function sortLinesByFifo<T extends { id: string; createdAt: Date }>(lines: T[]): Promise<T[]> {
  const keyed = await Promise.all(lines.map(async (line) => ({ line, key: await productionLineFifoKey(line) })));
  keyed.sort((a, b) => fifoCompare(a.key, b.key));
  return keyed.map((k) => k.line);
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

  const blockedLinesRaw = await prisma.productionListItem.findMany({
    where: { status: 'BLOQUE', product: { recipeItems: { some: { rawMaterialId } } } },
    include: { product: { include: { recipeItems: true } } },
  });
  if (blockedLinesRaw.length === 0) return;
  // FIFO cross-produit par commande réelle la plus ancienne/prioritaire, pas par la ligne
  // elle-même — cf. productionLineFifoKey.
  const blockedLines = await sortLinesByFifo(blockedLinesRaw);

  // `l.product` garanti non nul : le filtre ci-dessus exige `product: { recipeItems: { some } }`
  // — une ligne libre (sans fiche produit) ne peut jamais matcher cette condition.
  const ratioByLine = new Map(blockedLines.map((l) => [l.id, l.product!.recipeItems.find((r) => r.rawMaterialId === rawMaterialId)?.quantity ?? 0]));
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

    const recipe = await prisma.recipeItem.findMany({ where: { productId: line.productId! }, include: { rawMaterial: true } });
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

  const openLinesRaw = await prisma.productionListItem.findMany({
    where: { status: 'A_PRODUIRE', product: { recipeItems: { some: { rawMaterialId } } } },
    include: { product: { include: { recipeItems: true } } },
  });
  if (openLinesRaw.length === 0) { await resyncMaterialPurchaseNeed(rawMaterialId); return; }
  // FIFO cross-produit par commande réelle la plus ancienne/prioritaire, pas par la ligne
  // elle-même — cf. productionLineFifoKey.
  const openLines = await sortLinesByFifo(openLinesRaw);

  let poolLeft = material.reserved;
  let stillCovered = true;
  for (const line of openLines) {
    // `line.product` garanti non nul (même filtre que unblockProductionForMaterial ci-dessus).
    const ratio = line.product!.recipeItems.find((r) => r.rawMaterialId === rawMaterialId)?.quantity ?? 0;
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

// ── Réconciliation GLOBALE d'une matière — RÉSERVÉE au changement de RECETTE ────────────────
// Contrairement à unblockProductionForMaterial/reassessProductionForMaterial (qui ne retouchent
// jamais une ligne déjà "À produire" — un choix délibéré ailleurs : on ne vole jamais un
// `reserved` déjà accordé en réaction passive à une réception de stock ou une fabrication),
// une recette qui change redéfinit légitimement qui a besoin de quoi : ça justifie de TOUT
// recalculer à neuf, y compris rétrograder une ligne "À produire" plus récente pour couvrir une
// ligne plus ancienne devenue plus gourmande. Comme `reserved` est un pot commun jamais itemisé
// par ligne, rétrograder une ligne ne "prend" rien physiquement — ça ne fait que refléter
// honnêtement qui a vraiment la priorité sur ce qui existe.
//
// Prend TOUTES les lignes (Bloquées ET À produire) qui utilisent cette matière et ont un besoin
// réel > 0, les trie par ancienneté/priorité de leur VRAIE commande (productionLineFifoKey), et
// couvre dans cet ordre jusqu'à épuisement du stock total (available + reserved) de la matière —
// jamais plus. `reserved` est réécrit intégralement (pas un delta) pour refléter exactement ce
// qui est dû aux lignes couvertes ; le reste redevient `available`.
export async function reconcileMaterialAcrossAllLines(rawMaterialId: string) {
  const material = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } });
  if (!material) return;

  const linesRaw = await prisma.productionListItem.findMany({
    where: { status: { in: ['A_PRODUIRE', 'BLOQUE'] }, neededQuantity: { gt: 0 }, product: { recipeItems: { some: { rawMaterialId } } } },
    include: { product: { include: { recipeItems: { include: { rawMaterial: true } } } } },
  });
  if (linesRaw.length === 0) { await resyncMaterialPurchaseNeed(rawMaterialId); return; }

  const lines = await sortLinesByFifo(linesRaw);
  // `l.product` garanti non nul (le filtre ci-dessus exige `product: { recipeItems: { some } }`).
  const ratioByLine = new Map(lines.map((l) => [l.id, l.product!.recipeItems.find((r) => r.rawMaterialId === rawMaterialId)?.quantity ?? 0]));

  const totalStock = material.available + material.reserved;
  let cumulative = 0;
  const coveredLineIds = new Set<string>();
  for (const line of lines) {
    const owed = (ratioByLine.get(line.id) ?? 0) * line.neededQuantity;
    if (cumulative + owed > totalStock) break; // FIFO : s'arrête à la première non couverte pour cette matière
    cumulative += owed;
    coveredLineIds.add(line.id);
  }

  await prisma.rawMaterial.update({ where: { id: rawMaterialId }, data: { reserved: cumulative, available: totalStock - cumulative } });

  for (const line of lines) {
    // Couverte pour CETTE matière — vérifie encore les AUTRES ingrédients de sa recette avant de
    // déclarer la ligne définitivement "À produire" (même garde-fou que unblockProductionForMaterial).
    const finalBlocked = !coveredLineIds.has(line.id)
      || line.product!.recipeItems.some((r) => r.rawMaterialId !== rawMaterialId && r.rawMaterial.available < r.quantity * line.neededQuantity);
    if (finalBlocked !== (line.status === 'BLOQUE')) {
      await prisma.productionListItem.update({ where: { id: line.id }, data: { status: finalBlocked ? 'BLOQUE' : 'A_PRODUIRE' } });
    }
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
