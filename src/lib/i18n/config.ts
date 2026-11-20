// Configuration des langues du site public — importable côté serveur, client ET proxy (aucune dépendance React).
//
// URLs : le français (langue par défaut) reste SANS préfixe (/products), l'anglais et l'arabe
// sont préfixés (/en/products, /ar/products). En interne, le proxy réécrit /products → /fr/products
// (tout le site public vit sous app/[lang]) : l'adresse affichée reste donc /products.

export const LOCALES = ['fr', 'en', 'ar'] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = 'fr';

/** Cookie qui retient la langue choisie par le visiteur (lu par le proxy pour la 1re page d'une visite). */
export const LANG_COOKIE = 'psi-lang';

export const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LOCALES as readonly string[]).includes(v);

export const LANG_META: Record<Lang, { native: string; short: string; dir: 'ltr' | 'rtl'; ogLocale: string }> = {
  fr: { native: 'Français', short: 'FR', dir: 'ltr', ogLocale: 'fr_DZ' },
  en: { native: 'English', short: 'EN', dir: 'ltr', ogLocale: 'en_US' },
  ar: { native: 'العربية', short: 'AR', dir: 'rtl', ogLocale: 'ar_DZ' },
};

// Chemins qui ne sont PAS des pages du site public : jamais préfixés par une langue.
const NON_PUBLIC = /^\/(admin|api|d|r|_next)(\/|$)/;

/**
 * Retire le préfixe de langue d'un chemin : « /en/products » → { lang: 'en', path: '/products' }.
 * Un chemin sans préfixe (ou préfixé /fr, tel que le voit le serveur après réécriture) donne 'fr'.
 */
export function stripLang(pathname: string): { lang: Lang; path: string } {
  const m = pathname.match(/^\/(fr|en|ar)(\/.*)?$/);
  if (!m) return { lang: DEFAULT_LANG, path: pathname || '/' };
  return { lang: m[1] as Lang, path: m[2] || '/' };
}

/**
 * Adresse d'une page du site public dans une langue donnée.
 *   localePath('/products', 'en')    → '/en/products'
 *   localePath('/#about', 'ar')      → '/ar#about'
 *   localePath('/products', 'fr')     → '/products'
 * Les liens externes, ancres seules, mailto:/tel: et chemins hors site public (admin, api…) sont rendus tels quels.
 */
export function localePath(href: string, lang: Lang): string {
  if (!href.startsWith('/') || href.startsWith('//') || NON_PUBLIC.test(href)) return href;
  const m = href.match(/^([^?#]*)(.*)$/)!;
  const base = stripLang(m[1] || '/').path; // déjà préfixé ? on repart du chemin nu
  if (lang === DEFAULT_LANG) return (base === '/' && m[2] ? '/' : base) + m[2];
  return `/${lang}${base === '/' ? '' : base}${m[2]}`;
}

/** Clé SiteContent d'un texte modifiable dans une langue : « hero_titre » (fr) / « hero_titre__en » / « hero_titre__ar ». */
export const contentKey = (key: string, lang: Lang) => (lang === DEFAULT_LANG ? key : `${key}__${lang}`);

/** Texte modifiable depuis l'admin dans la langue demandée, sinon `fallback` (le texte du dictionnaire). */
export function pickContent(content: Record<string, string>, key: string, lang: Lang, fallback: string): string {
  const v = content[contentKey(key, lang)];
  return v && v.trim() ? v : fallback;
}
