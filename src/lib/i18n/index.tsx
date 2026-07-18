'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fr } from './fr';
import { ar } from './ar';

export type Lang = 'fr' | 'ar';

const translations = { fr, ar };

type TranslationKey = string; // dot-path like 'nav.home'

function resolve(obj: unknown, path: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return path.split('.').reduce((acc: any, key) => acc?.[key], obj) ?? path;
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'fr',
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('psi-lang') as Lang | null;
      if (stored === 'fr' || stored === 'ar') setLangState(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('psi-lang', lang);
    } catch {}
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const t = (key: TranslationKey) => resolve(translations[lang], key);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LangContext);
}
