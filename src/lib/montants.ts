// Montant d'un devis LIVRÉ pour les ventes (dashboard), en TTC — même règle que la liste
// (cf. quoteToDetail, src/lib/request-detail.ts) : prix proposé × 1,19 si la TVA est activée,
// SAUF si le montant saisi est déjà TTC (ventes importées : priceIncludesVat).
// Idem pour une commande : somme des lignes (HT) × 1,19 si TVA, sauf prix déjà TTC.
export const orderSalesAmount = (o: { items: { quantity: number | null; unitPrice: number | null }[]; vatEnabled: boolean; priceIncludesVat: boolean }) => {
  const base = o.items.reduce((acc, it) => acc + (it.quantity ?? 0) * (it.unitPrice ?? 0), 0);
  return o.vatEnabled && !o.priceIncludesVat ? Math.round(base * 1.19) : base;
};

export const quoteSalesAmount = (q: { proposedPrice: number | null; vatEnabled: boolean; priceIncludesVat: boolean }) => {
  const base = q.proposedPrice ?? 0;
  return q.vatEnabled && !q.priceIncludesVat ? Math.round(base * 1.19) : base;
};
