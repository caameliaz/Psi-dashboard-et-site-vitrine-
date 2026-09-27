import { prisma } from './prisma';

// ─── Référence de stock (le « 100 % ») et seuil d'alerte ──────────────────────
// Règle métier : à chaque ENTRÉE de stock (production, réception d'achat, réassort,
// correction manuelle À LA HAUSSE), le disponible obtenu devient la nouvelle référence
// (stockMax = 100 %) et le seuil d'alerte passe à 30 % de cette référence — l'alerte
// (« Stock faible » + réassort en liste de production/achat jusqu'à la référence) se
// déclenche donc quand 70 % ont été consommés. Une BAISSE ne change jamais la référence.
// Le seuil reste modifiable à la main (page des seuils) jusqu'à la prochaine entrée.
// À appeler AVANT les recalculs de buffer (resync/reallocate), qui utilisent ces seuils.

const PART_ALERTE = 0.3; // alerte à 30 % restants = 70 % consommés

const referenceEtSeuil = (disponible: number) => {
  const reference = Math.round(disponible);
  return { reference, seuil: Math.max(1, Math.round(reference * PART_ALERTE)) };
};

/** Produit fini : si le disponible a augmenté depuis `disponibleAvant`, il devient la référence. */
export async function fixerReferenceProduit(productId: string, disponibleAvant: number) {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { available: true } });
  if (!p || p.available <= disponibleAvant || p.available < 1) return;
  const { reference, seuil } = referenceEtSeuil(p.available);
  await prisma.product.update({
    where: { id: productId },
    data: { stockMax: reference, purchaseThreshold: seuil, productionThreshold: seuil },
  });
}

/** Matière première : si le disponible a augmenté depuis `disponibleAvant`, il devient la référence. */
export async function fixerReferenceMatiere(rawMaterialId: string, disponibleAvant: number) {
  const m = await prisma.rawMaterial.findUnique({ where: { id: rawMaterialId }, select: { available: true } });
  if (!m || m.available <= disponibleAvant || m.available < 1) return;
  const { reference, seuil } = referenceEtSeuil(m.available);
  await prisma.rawMaterial.update({
    where: { id: rawMaterialId },
    data: { stockMax: reference, purchaseThreshold: seuil },
  });
}
