// Matières premières à DEUX unités (ex. papier Koehler : poids en kg + nombre de bobines).
//
// Principe : on ne stocke qu'UNE quantité (l'unité principale, ex. kg) et un RAPPORT « kg par bobine »
// (`primaryPerSecondary`). Le nombre de bobines est TOUJOURS déduit : bobines = kg ÷ rapport. Il baisse donc tout
// seul quand le poids baisse (production), sans rien brancher ailleurs — c'est une estimation, corrigée à la main
// par « il reste 1/2 bobine » (qui recale le rapport). Fichier sans dépendance : utilisable côté serveur et client.

/** « 2 1/2 », « 1/3 », « 2.5 », « 2,5 » → nombre ; texte invalide → null. */
export function parseFraction(input: string | null | undefined): number | null {
  const s = String(input ?? '').trim().replace(',', '.');
  if (!s) return null;
  let m = s.match(/^(\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);
  m = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[2]) > 0 ? Number(m[1]) / Number(m[2]) : null;
  m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (m) return Number(m[3]) > 0 ? Number(m[1]) + Number(m[2]) / Number(m[3]) : null;
  return null;
}

const FRACTIONS: [number, string][] = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];

/** 2.5 → « 2 ½ » ; 0.333 → « ⅓ » ; 2.37 → « 2,37 » (fractions simples en symbole, sinon décimales). */
export function formatSecondary(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  const entier = Math.floor(n + 0.02);
  const reste = n - entier;
  if (Math.abs(reste) < 0.02 || n - entier < 0) return String(entier);
  const f = FRACTIONS.find(([v]) => Math.abs(reste - v) < 0.02);
  if (f) return entier > 0 ? `${entier} ${f[1]}` : f[1];
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

/** Quantité en 2e unité pour une quantité de l'unité principale (null si le rapport est inconnu). */
export function secondaryOf(primary: number, ratio: number | null | undefined): number | null {
  return ratio && ratio > 0 ? primary / ratio : null;
}

/** Nouveau rapport après une réception de `kgRecus` kg = `secRecues` bobines (moyenne pondérée avec l'existant). */
export function ratioAfterReception(availableBefore: number, ratioBefore: number | null | undefined, kgRecus: number, secRecues: number): number | null {
  if (!(kgRecus > 0) || !(secRecues > 0)) return ratioBefore ?? null;
  const secAvant = ratioBefore && ratioBefore > 0 && availableBefore > 0 ? availableBefore / ratioBefore : 0;
  const kgAvant = secAvant > 0 ? availableBefore : 0; // sans rapport connu, l'ancien stock n'entre pas dans la moyenne
  return (kgAvant + kgRecus) / (secAvant + secRecues);
}
