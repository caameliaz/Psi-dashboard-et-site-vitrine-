// Montant d'un devis LIVRÉ pour les ventes (dashboard), en TTC — même règle que la liste
// (cf. quoteToDetail, src/lib/request-detail.ts) : prix proposé × 1,19 si la TVA est activée,
// SAUF si le montant saisi est déjà TTC (ventes importées : priceIncludesVat).
export const quoteSalesAmount = (q: { proposedPrice: number | null; vatEnabled: boolean; priceIncludesVat: boolean }) => {
  const base = q.proposedPrice ?? 0;
  return q.vatEnabled && !q.priceIncludesVat ? Math.round(base * 1.19) : base;
};
