'use client';

// Traduction du catalogue (catégories, références, fiche technique) depuis le dashboard.
// Un sélecteur de langue (Français / English / العربية) bascule les overlays produits entre la saisie d'origine
// (français) et la saisie des textes dans l'autre langue. Stockage et API : cf. lib/i18n/translations-shared.ts.

import type { FieldDefTr, ProductTr, TrLang, TrStore } from '@/lib/i18n/translations-shared';
import { TR_LANGS } from '@/lib/i18n/translations-shared';

export type EditLang = 'fr' | TrLang;
const LANG_NAME: Record<EditLang, string> = { fr: 'Français', en: 'English', ar: 'العربية' };

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

// ── Formulaires ──────────────────────────────────────────────────────────────
export interface RefTrForm { name: string; usage: string; fields: Record<string, string> }
export type RefTr = Record<TrLang, RefTrForm>
export interface CatTrForm { name: string; description: string }
export type CatTr = Record<TrLang, CatTrForm>
/** Libellés traduits des champs de la fiche technique : { <définitionId>: { en, ar } } */
export type DefTr = Record<string, Record<TrLang, string>>

export const emptyRefTr = (): RefTr => ({ en: { name: '', usage: '', fields: {} }, ar: { name: '', usage: '', fields: {} } });
export const emptyCatTr = (): CatTr => ({ en: { name: '', description: '' }, ar: { name: '', description: '' } });

export function refTrFromStore(store: TrStore, productId: string): RefTr {
  const out = emptyRefTr();
  for (const l of TR_LANGS) {
    const t: ProductTr = store.product[productId]?.[l] ?? {};
    out[l] = { name: t.name ?? '', usage: t.usage ?? '', fields: { ...(t.fields ?? {}) } };
  }
  return out;
}
export function catTrFromStore(store: TrStore, catId: string): CatTr {
  const out = emptyCatTr();
  for (const l of TR_LANGS) {
    const t = store.category[catId]?.[l] ?? {};
    out[l] = { name: t.name ?? '', description: t.description ?? '' };
  }
  return out;
}
export function defTrFromStore(store: TrStore): DefTr {
  const out: DefTr = {};
  for (const [id, byLang] of Object.entries(store.fielddef)) {
    out[id] = { en: (byLang.en as FieldDefTr | undefined)?.label ?? '', ar: (byLang.ar as FieldDefTr | undefined)?.label ?? '' };
  }
  return out;
}

// ── Enregistrement ───────────────────────────────────────────────────────────
async function put(kind: 'category' | 'product' | 'fielddef', id: string, lang: TrLang, data: unknown) {
  try {
    const res = await fetch('/api/translations', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, lang, data }),
    });
    return res.ok;
  } catch { return false; }
}

/** Enregistre les traductions d'une référence (toutes langues). Renvoie false si au moins un envoi a échoué. */
export async function saveRefTr(productId: string, tr: RefTr) {
  const r = await Promise.all(TR_LANGS.map((l) => put('product', productId, l, tr[l])));
  return r.every(Boolean);
}
export async function saveCatTr(catId: string, tr: CatTr) {
  const r = await Promise.all(TR_LANGS.map((l) => put('category', catId, l, { name: tr[l].name, description: tr[l].description })));
  return r.every(Boolean);
}
/** Libellés de la fiche technique : seuls ceux qui diffèrent de ce qui est déjà enregistré sont envoyés. */
export async function saveDefTr(defTr: DefTr, store: TrStore) {
  const jobs: Promise<boolean>[] = [];
  for (const [id, byLang] of Object.entries(defTr)) {
    for (const l of TR_LANGS) {
      const before = (store.fielddef[id]?.[l] as FieldDefTr | undefined)?.label ?? '';
      if ((byLang[l] ?? '').trim() !== before) jobs.push(put('fielddef', id, l, { label: byLang[l] ?? '' }));
    }
  }
  return (await Promise.all(jobs)).every(Boolean);
}

// ── Sélecteur de langue ──────────────────────────────────────────────────────
export function LangTabs({ value, onChange }: { value: EditLang; onChange: (l: EditLang) => void }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
      <div className="flex gap-1 p-1 rounded-lg bg-[#F1F5F9]">
        {(['fr', 'en', 'ar'] as const).map((l) => (
          <button key={l} type="button" onClick={() => onChange(l)} aria-pressed={value === l}
            className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-colors ${value === l ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5] hover:text-[#374151]'}`}>
            {LANG_NAME[l]}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[#8A9BB5] mt-2 leading-snug">
        {value === 'fr'
          ? 'Saisie d’origine (français). Choisissez English ou العربية pour traduire les textes affichés sur le site : un champ laissé vide reste en français.'
          : `Traduction ${LANG_NAME[value]} — uniquement les textes du site ; prix, dimensions, stock et codes ne changent pas.`}
      </p>
    </div>
  );
}

const dirOf = (lang: EditLang) => (lang === 'ar' ? 'rtl' : 'ltr');

function Field({ label, original, children }: { label: string; original?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">{label}</label>
      {children}
      {original?.trim() ? <p className="text-[11px] text-[#ABBED1] mt-1 truncate" title={original}>FR : {original}</p> : null}
    </div>
  );
}

/** Nom et description de la catégorie dans la langue choisie. */
export function CategoryTrFields({ lang, value, onChange, original }: {
  lang: TrLang; value: CatTrForm; onChange: (v: CatTrForm) => void; original: { name: string; description: string };
}) {
  return (
    <div className="space-y-4">
      <Field label={`Nom de la catégorie (${LANG_NAME[lang]})`} original={original.name}>
        <input dir={dirOf(lang)} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} className={inputClass} />
      </Field>
      <Field label={`Description (${LANG_NAME[lang]})`} original={original.description}>
        <textarea dir={dirOf(lang)} rows={3} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} className={inputClass + ' resize-none'} />
      </Field>
    </div>
  );
}

/** Textes d'une référence dans la langue choisie : nom, utilisation et fiche technique (libellés + valeurs). */
export function RefTrFields({ lang, value, onChange, original, fieldDefs, defTr, setDefTr }: {
  lang: TrLang; value: RefTrForm; onChange: (v: RefTrForm) => void;
  original: { name: string; usage: string; fields: Record<string, string> };
  fieldDefs: { id: string; label: string }[];
  defTr: DefTr; setDefTr: (d: DefTr) => void;
}) {
  const dir = dirOf(lang);
  return (
    <div className="space-y-4">
      <Field label={`Nom de la référence (${LANG_NAME[lang]})`} original={original.name}>
        <input dir={dir} value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} className={inputClass} />
      </Field>
      <Field label={`Utilisation (${LANG_NAME[lang]})`} original={original.usage}>
        <input dir={dir} value={value.usage} onChange={(e) => onChange({ ...value, usage: e.target.value })} className={inputClass} />
      </Field>
      {fieldDefs.length > 0 && (
        <div className="pt-1 border-t border-[#F0F4F8]">
          <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-wide mt-3 mb-2">Fiche technique ({LANG_NAME[lang]})</p>
          <div className="space-y-3">
            {fieldDefs.map((def) => (
              <div key={def.id} className="grid grid-cols-2 gap-3">
                <Field label="Libellé" original={def.label}>
                  <input dir={dir} value={defTr[def.id]?.[lang] ?? ''}
                    onChange={(e) => setDefTr({ ...defTr, [def.id]: { ...(defTr[def.id] ?? { en: '', ar: '' }), [lang]: e.target.value } })} className={inputClass} />
                </Field>
                <Field label="Valeur" original={original.fields[def.id]}>
                  <input dir={dir} value={value.fields[def.id] ?? ''}
                    onChange={(e) => onChange({ ...value, fields: { ...value.fields, [def.id]: e.target.value } })} className={inputClass} />
                </Field>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#8A9BB5] mt-2">Le libellé est commun à toutes les références (ex. « Grammage » → « Weight »).</p>
        </div>
      )}
    </div>
  );
}
