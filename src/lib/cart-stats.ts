import { prisma } from './prisma';

// Paniers du site public (suivi anonyme, cf. schema.prisma CartSession) — pas de
// temps réel, pas de cron : recalculé à la demande (appelé par /api/cart-tracking/stats,
// lu par le dashboard) à chaque fois que l'admin regarde ce chiffre.
const DELAI_ABANDON_MS = 24 * 60 * 60 * 1000; // 24h sans modification = abandonné

export interface CartStats {
  crees: number; // total de paniers créés sur la période (tous statuts confondus)
  abandonnes: number;
  convertis: number;
  enCours: number; // ni abandonné ni converti pour l'instant (peut encore l'être)
}

/** Fait passer EN_COURS → ABANDONNE tout panier inactif depuis plus de 24h. */
async function marquerPaniersAbandonnes() {
  const seuil = new Date(Date.now() - DELAI_ABANDON_MS);
  await prisma.cartSession.updateMany({
    where: { status: 'EN_COURS', updatedAt: { lt: seuil } },
    data: { status: 'ABANDONNE' },
  });
}

/** Statistiques paniers sur [startDate, endDate] (inclus), par date de création. */
export async function getCartStats(range: { startDate: string; endDate: string }): Promise<CartStats> {
  await marquerPaniersAbandonnes();

  const createdAt = {
    gte: new Date(`${range.startDate}T00:00:00`),
    lt: new Date(new Date(`${range.endDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000),
  };
  const [crees, abandonnes, convertis, enCours] = await Promise.all([
    prisma.cartSession.count({ where: { createdAt } }),
    prisma.cartSession.count({ where: { createdAt, status: 'ABANDONNE' } }),
    prisma.cartSession.count({ where: { createdAt, status: 'CONVERTI' } }),
    prisma.cartSession.count({ where: { createdAt, status: 'EN_COURS' } }),
  ]);
  return { crees, abandonnes, convertis, enCours };
}
