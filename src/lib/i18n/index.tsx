'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fr } from './fr';
import { en } from './en';
import { ar } from './ar';
import { LANG_COOKIE, LANG_META, localePath, stripLang, type Lang } from './config';

export type { Lang } from './config';

const translations = { fr, en, ar };

type TranslationKey = string; // dot-path like 'nav.home'

function resolve(obj: unknown, path: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return path.split('.').reduce((acc: any, key) => acc?.[key], obj) ?? path;
}

interface LangContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  /** Change de langue = change d'adresse (/products → /en/products) et retient le choix dans un cookie. */
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

// Hors du site public (dashboard admin, pas de LangProvider) : français, sans préfixe.
const LangContext = createContext<LangContextValue>({
  lang: 'fr',
  dir: 'ltr',
  setLang: () => {},
  t: (key) => resolve(fr, key),
});

// La langue vient de l'ADRESSE (segment [lang], connu du serveur) : le HTML envoyé est déjà dans la bonne
// langue pour les visiteurs ET pour Google, sans clignotement ni lecture du navigateur.
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const setLang = useCallback((l: Lang) => {
    if (l === lang) return;
    try { document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`; } catch {}
    const { path } = stripLang(pathname ?? '/');
    router.push(localePath(path, l) + window.location.search + window.location.hash);
  }, [lang, pathname, router]);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    dir: LANG_META[lang].dir,
    setLang,
    t: (key) => resolve(translations[lang], key),
  }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useTranslation() {
  return useContext(LangContext);
}

/** Donne l'adresse d'une page du site dans la langue courante : lp('/products') → '/en/products'. Pour router.push(). */
export function useLocalePath() {
  const { lang } = useTranslation();
  return useCallback((href: string) => localePath(href, lang), [lang]);
}
