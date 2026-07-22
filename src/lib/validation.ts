// ── Validation des saisies (formulaires) ─────────────────────────────────────
// Source unique, utilisable côté client (formulaires) ET serveur (routes API).
// Chaque fonction renvoie `null` si c'est valide, sinon une CLÉ de traduction
// (ex. 'errors.phone_invalid') que l'appelant passe à t() → messages traduits
// en français ET en arabe. Les libellés dépendant d'un champ (nom, entreprise…)
// restent en clair car ils reprennent l'intitulé du champ.

/** Email : doit contenir un @ et un domaine avec extension (ex: nom@psi.dz). */
export function validateEmail(value: string, required = false): string | null {
  const v = value.trim();
  if (!v) return required ? 'errors.email_required' : null;
  // Format simple et robuste : quelque chose @ quelque chose . extension (2+ lettres)
  if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v)) {
    return 'errors.email_invalid';
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
  if (!v) return required ? 'errors.phone_required' : null;
  const clean = v.replace(/[\s.-]/g, '');
  if (/^\+213\d{9}$/.test(clean)) return null;
  if (/^0\d{9}$/.test(clean)) return null;
  return 'errors.phone_invalid';
}

/** Normalise un téléphone pour le stockage : retire espaces/tirets/points. */
export function normalizePhone(value: string): string {
  return value.trim().replace(/[\s.-]/g, '');
}

/** Normalise un email pour le stockage : trim + minuscules. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Texte obligatoire avec longueur min/max (nom, entreprise, message…). */
export function validateText(value: string, label: string, min = 2, required = true, max = 500): string | null {
  const v = value.trim();
  if (!v) return required ? `${label} obligatoire.` : null;
  if (v.length < min) return `${label} : ${min} caractères minimum.`;
  if (v.length > max) return `${label} : ${max} caractères maximum.`;
  return null;
}

/** Quantité : entier strictement positif. */
export function validateQuantity(value: string | number): string | null {
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return 'errors.quantity_invalid';
  if (!Number.isInteger(n)) return 'errors.quantity_integer';
  if (n <= 0) return 'errors.quantity_positive';
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

/**
 * Traduit une clé d'erreur en FRANÇAIS — pour l'admin, qui n'est pas multilingue.
 * (Le site public passe par t() et gère aussi l'arabe.)
 */
const MESSAGES_FR: Record<string, string> = {
  'errors.email_invalid': 'Email invalide (exemple : nom@entreprise.dz).',
  'errors.email_required': 'Email obligatoire.',
  'errors.phone_invalid': 'Téléphone invalide : 0X XX XX XX XX (10 chiffres) ou +213 suivi de 9 chiffres.',
  'errors.phone_required': 'Téléphone obligatoire.',
  'errors.quantity_invalid': 'Quantité invalide.',
  'errors.quantity_integer': 'La quantité doit être un nombre entier.',
  'errors.quantity_positive': 'La quantité doit être supérieure à 0.',
  'errors.field_required': 'Ce champ est obligatoire.',
  'errors.number_invalid': 'Nombre invalide.',
  'errors.number_negative': 'Cette valeur ne peut pas être négative.',
};

export function messageErreur(cle: string | null): string {
  if (!cle) return '';
  return MESSAGES_FR[cle] ?? cle; // les libellés déjà en clair passent tels quels
}
