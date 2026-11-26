// Traductions du catalogue — accès base (serveur uniquement). Format et stockage : cf. translations-shared.ts.
import { prisma } from '@/lib/prisma';
import {
  emptyStore, parseTrKey, trKey, TR_PREFIX,
  type CategoryTr, type FieldDefTr, type ProductTr, type TrKind, type TrLang, type TrStore,
} from './translations-shared';

export async function loadStore(): Promise<TrStore> {
  const store = emptyStore();
  try {
    const rows = await prisma.siteContent.findMany({ where: { key: { startsWith: TR_PREFIX } } });
    for (const row of rows) {
      const k = parseTrKey(row.key);
      if (!k) continue;
      try {
        const data = JSON.parse(row.value);
        ((store[k.kind] as Record<string, Record<string, unknown>>)[k.id] ??= {})[k.lang] = data;
      } catch { /* ligne illisible : ignorée */ }
    }
  } catch { /* base indisponible : on affiche le français */ }
  return store;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Nettoie une traduction : champs vides retirés. Renvoie null si plus rien. */
function clean(kind: TrKind, data: unknown): CategoryTr | ProductTr | FieldDefTr | null {
  const d = (data ?? {}) as Record<string, unknown>;
  if (kind === 'category') {
    const out: CategoryTr = {};
    if (str(d.name)) out.name = str(d.name);
    if (str(d.description)) out.description = str(d.description);
    const usages = (Array.isArray(d.usages) ? d.usages : []).map(str).filter(Boolean).slice(0, 3);
    if (usages.length) out.usages = usages;
    return Object.keys(out).length ? out : null;
  }
  if (kind === 'product') {
    const out: ProductTr = {};
    if (str(d.name)) out.name = str(d.name);
    if (str(d.usage)) out.usage = str(d.usage);
    const fields = Object.fromEntries(Object.entries((d.fields ?? {}) as Record<string, unknown>).map(([k, v]) => [k, str(v)]).filter(([, v]) => v));
    if (Object.keys(fields).length) out.fields = fields as Record<string, string>;
    return Object.keys(out).length ? out : null;
  }
  const out: FieldDefTr = {};
  if (str(d.label)) out.label = str(d.label);
  return Object.keys(out).length ? out : null;
}

/**
 * Enregistre la traduction d'un élément dans une langue. FUSIONNE avec l'existant : seules les clés présentes dans `data`
 * sont remplacées (une chaîne vide supprime la clé) — enregistrer le nom d'une catégorie ne touche donc pas à ses usages,
 * saisis depuis une autre page. Une fois tout vide, la ligne est supprimée.
 */
export async function saveTranslation(kind: TrKind, id: string, lang: TrLang, data: unknown) {
  const key = trKey(kind, id, lang);
  let existing: Record<string, unknown> = {};
  try {
    const row = await prisma.siteContent.findUnique({ where: { key } });
    if (row) existing = JSON.parse(row.value);
  } catch { /* ligne absente ou illisible : on repart de zéro */ }
  const merged = { ...existing, ...((data ?? {}) as Record<string, unknown>) };
  const cleaned = clean(kind, merged);
  if (!cleaned) { await prisma.siteContent.deleteMany({ where: { key } }); return; }
  const value = JSON.stringify(cleaned);
  await prisma.siteContent.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** À la suppression d'une catégorie / d'un produit : retire ses traductions. */
export async function deleteTranslations(kind: TrKind, id: string) {
  try { await prisma.siteContent.deleteMany({ where: { key: { startsWith: `${TR_PREFIX}${kind}:${id}:` } } }); } catch { /* sans gravité */ }
}

// ── Application sur les données du site public ───────────────────────────────

/** Catégorie dans la langue demandée (+ `originalName` français : envoyé tel quel dans les devis/commandes, jamais le texte traduit). */
export function localizeCategory<T extends { id: string; name: string; description?: string | null }>(c: T, store: TrStore, lang: TrLang | null): T & { originalName: string; descriptionTr: boolean } {
  const tr = lang ? store.category[c.id]?.[lang] : undefined;
  return { ...c, name: tr?.name || c.name, description: tr?.description || c.description, originalName: c.name, descriptionTr: !!tr?.description };
}

/** Produit dans la langue demandée : nom, usage, valeurs et libellés de la fiche technique, catégorie imbriquée. */
export function localizeProduct<T extends {
  id: string; name?: string | null; usage?: string;
  category?: { id: string; name: string; description?: string | null } | null;
  customFields?: { definitionId: string; value: string; definition: { id: string; label: string } }[];
}>(p: T, store: TrStore, lang: TrLang | null): T {
  if (!lang) return p;
  const tr = store.product[p.id]?.[lang];
  return {
    ...p,
    name: tr?.name || p.name,
    usage: tr?.usage || p.usage,
    category: p.category ? localizeCategory(p.category, store, lang) : p.category,
    customFields: p.customFields?.map((cf) => ({
      ...cf,
      value: tr?.fields?.[cf.definitionId] || cf.value,
      // `originalLabel` : le libellé français sert à choisir l'icône de la fiche technique
      definition: { ...cf.definition, label: store.fielddef[cf.definition.id]?.[lang]?.label || cf.definition.label, originalLabel: cf.definition.label },
    })),
  };
}
