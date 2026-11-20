// Timbre sur paiement en ESPÈCES : calculé selon un palier de montant (pas un taux fixe).
// Les paliers sont modifiables par les admins (Réglages → Documents) ; les valeurs par défaut ci-dessous
// sont celles que Camélia connaît « à ma connaissance » et DOIVENT être confirmées par l'admin/le comptable.

export interface StampTier {
  from: number; // montant TTC à partir duquel (exclu pour le palier 1 : 0)
  to: number | null; // jusqu'à (inclus) ; null = sans limite
  rate: number; // en %, appliqué au montant TOTAL du palier (pas par tranche)
}
export interface StampDutyConfig {
  tiers: StampTier[];
  minimum: number; // DA — 0 = pas de minimum
}

export const DEFAULT_STAMP_DUTY: StampDutyConfig = {
  tiers: [
    { from: 0, to: 300_000, rate: 1 },
    { from: 300_000, to: 30_000_000, rate: 1.5 },
    { from: 30_000_000, to: null, rate: 2 },
  ],
  minimum: 5,
};

// Montant du timbre (DA, arrondi à l'unité) pour un total TTC payé en espèces.
export function stampDuty(ttc: number, cfg: StampDutyConfig = DEFAULT_STAMP_DUTY): number {
  if (!(ttc > 0)) return 0;
  const tier = cfg.tiers.find((t) => ttc > t.from && (t.to === null || ttc <= t.to)) ?? cfg.tiers[0];
  if (!tier) return 0;
  return Math.max(cfg.minimum || 0, Math.round((ttc * tier.rate) / 100));
}
