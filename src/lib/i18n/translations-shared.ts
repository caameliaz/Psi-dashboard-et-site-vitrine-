// Traductions du CATALOGUE (catégories, références, libellés de fiche technique) — types et utilitaires sans
// dépendance serveur, partagés par l'admin (formulaires) et l'API.
//
// Stockage : table SiteContent (déjà utilisée pour les galeries et usages), une ligne par élément et par langue :
//   i18n:category:<id>:en  → { name, description, usages[] }
//   i18n:product:<id>:ar   → { name, usage, fields: { <définitionId>: valeur } }
//   i18n:fielddef:<id>:ar  → { label }
// Le français reste la valeur d'origine en base (Category.name…) ; une traduction absente ou vide = on affiche le français.

export const TR_LANGS = ['en', 'ar'] as const;
export type TrLang = (typeof TR_LANGS)[number];
export const isTrLang = (v: unknown): v is TrLang => v === 'en' || v === 'ar';

export type TrKind = 'category' | 'product' | 'fielddef';

export interface CategoryTr { name?: string; description?: string; usages?: string[] }
export interface ProductTr { name?: string; usage?: string; fields?: Record<string, string> }
export interface FieldDefTr { label?: string }

export interface TrStore {
  category: Record<string, Partial<Record<TrLang, CategoryTr>>>;
  product: Record<string, Partial<Record<TrLang, ProductTr>>>;
  fielddef: Record<string, Partial<Record<TrLang, FieldDefTr>>>;
}
export const emptyStore = (): TrStore => ({ category: {}, product: {}, fielddef: {} });

export const TR_PREFIX = 'i18n:';
export const trKey = (kind: TrKind, id: string, lang: TrLang) => `${TR_PREFIX}${kind}:${id}:${lang}`;

export function parseTrKey(key: string): { kind: TrKind; id: string; lang: TrLang } | null {
  const m = key.match(/^i18n:(category|product|fielddef):(.+):(en|ar)$/);
  return m ? { kind: m[1] as TrKind, id: m[2], lang: m[3] as TrLang } : null;
}
