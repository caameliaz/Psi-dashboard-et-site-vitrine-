// Dictionnaires accessibles côté serveur (métadonnées SEO, pages serveur) — sans React.
import { fr } from './fr';
import { en } from './en';
import { ar } from './ar';
import type { Lang } from './config';

export const dictionaries = { fr, en, ar };
export const getDict = (lang: Lang) => dictionaries[lang];
