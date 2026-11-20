// Métadonnées SEO des pages publiques, une version par langue : titre/description traduits,
// adresse canonique propre à la langue et balises hreflang vers les 2 autres versions.
import type { Metadata } from 'next';
import { DEFAULT_LANG, LANG_META, LOCALES, localePath, type Lang } from './config';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.psi.dz';
export const BRAND = 'SARL Paper Solutions Industry';

/** Adresses d'une même page dans chaque langue (pour <link rel="alternate" hreflang>). */
export function alternatesFor(path: string, lang: Lang): NonNullable<Metadata['alternates']> {
  return {
    canonical: localePath(path, lang),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, localePath(path, l)])),
      'x-default': localePath(path, DEFAULT_LANG),
    },
  };
}

export function localizedMetadata(
  lang: Lang,
  path: string,
  opts: { title: string; description?: string; absoluteTitle?: boolean },
): Metadata {
  const title = opts.absoluteTitle ? { absolute: `${opts.title} | ${BRAND}` } : opts.title;
  return {
    title,
    ...(opts.description ? { description: opts.description } : {}),
    alternates: alternatesFor(path, lang),
    // openGraph remplace celui du layout (fusion de niveau 1 seulement) : on redonne tout ce qui doit rester.
    openGraph: {
      siteName: BRAND,
      type: 'website',
      locale: LANG_META[lang].ogLocale,
      alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => LANG_META[l].ogLocale),
      url: localePath(path, lang),
      title: `${opts.title} | ${BRAND}`,
      ...(opts.description ? { description: opts.description } : {}),
    },
  };
}
