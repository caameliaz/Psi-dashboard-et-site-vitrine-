// ── Validation des saisies (formulaires) ─────────────────────────────────────
// Source unique, utilisable côté client (formulaires) ET serveur (routes API).
// Chaque fonction renvoie `null` si c'est valide, sinon un message d'erreur en français.

/** Email : doit contenir un @ et un domaine avec extension (ex: nom@psi.dz). */
export function validateEmail(value: string, required = false): string | null {
  const v = value.trim();
  if (!v) return required ? 'Email obligatoire.' : null;
  // Format simple et robuste : quelque chose @ quelque chose . extension (2+ lettres)
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v)) {
    return 'Email invalide (exemple : nom@entreprise.dz).';
  }
  return null;
}

/**
 * Téléphone algérien. Deux formats acceptés :
 *   - +213 suivi de 9 chiffres  (ex: +213555123456)
 *   - 0 suivi de 9 chiffres = 10 chiffres au total (ex: 0555123456)
 * Les espaces, tirets et points sont tolérés à la saisie.
 */
export function validatePhone(value: string, required = false): string | null {
  const v = value.trim();
  if (!v) return required ? 'Téléphone obligatoire.' : null;
  const clean = v.replace(/[\s.-]/g, '');
  if (/^\+213\d{9}$/.test(clean)) return null;
  if (/^0\d{9}$/.test(clean)) return null;
  return 'Téléphone invalide : 0X XX XX XX XX (10 chiffres) ou +213 suivi de 9 chiffres.';
}

/** Normalise un téléphone pour le stockage : retire espaces/tirets/points. */
export function normalizePhone(value: string): string {
  return value.trim().replace(/[\s.-]/g, '');
}

/** Normalise un email pour le stockage : trim + minuscules. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Texte obligatoire avec longueur minimale (nom, entreprise…). */
export function validateText(value: string, label: string, min = 2, required = true): string | null {
  const v = value.trim();
  if (!v) return required ? `${label} obligatoire.` : null;
  if (v.length < min) return `${label} : ${min} caractères minimum.`;
  return null;
}

/** Quantité : entier strictement positif. */
export function validateQuantity(value: string | number): string | null {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return 'Quantité invalide.';
  if (!Number.isInteger(n)) return 'La quantité doit être un nombre entier.';
  if (n <= 0) return 'La quantité doit être supérieure à 0.';
  return null;
}

/** Nombre positif ou nul, facultatif (prix, métrage…). */
export function validatePositiveNumber(
  value: string | number,
  label: string,
  required = false,
): string | null {
  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (!raw) return required ? `${label} obligatoire.` : null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return `${label} : nombre invalide.`;
  if (n < 0) return `${label} ne peut pas être négatif.`;
  return null;
}

/**
 * Valide un ensemble de champs d'un coup.
 * Renvoie le premier message d'erreur trouvé, ou null si tout est valide.
 * Usage : const err = firstError([validateEmail(email), validatePhone(tel, true)]);
 */
export function firstError(errors: (string | null)[]): string | null {
  return errors.find((e) => e !== null) ?? null;
}
