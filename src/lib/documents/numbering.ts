// Numérotation des documents : un compteur par type et par année, modifiable par les admins.
//  • FACTURE : « F 023/2026 », repart à 1 chaque année. Le numéro est RÉSERVÉ dès qu'une commande / un devis a la TVA
//              (cf. reservation.ts) ; il reste attaché à la commande même si la facture n'est pas encore générée.
//  • BL avec facture (BL_FACTURE) : « BL-F 023/2026 » — porte le numéro de la facture de la commande. Plusieurs BL pour
//              la même commande : « BL-F 023 bis/2026 », « BL-F 023 bis 2/2026 »… (regroupés ensuite dans UNE facture).
//  • BL sans facture (BL) : « BL 016-2026 », compteur propre, indépendant des factures.
//  • PROFORMA: « FP-01-2026 », compteur propre.
// PAS DE TROU : le numéro proposé est le plus petit numéro LIBRE au-dessus du « plancher » du compteur (le dernier numéro
// saisi par un admin). Un numéro libéré (commande annulée, BL supprimé…) est donc réattribué.
// Le numéro imprimé (Document.number) fait foi ; seq/suffix ne servent qu'à proposer le suivant.
import { prisma } from '@/lib/prisma';
import { DEFAULT_SETTINGS } from './defaults';
import type { DocumentKind } from './types';

export type NumberFormats = Record<DocumentKind | 'BL_FACTURE', string>;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// Remplace {seq}, {seq:3} (zéros à gauche), {year}, {suffix} (→ « ␣bis » ou rien)
export function formatDocumentNumber(format: string, seq: number, year: number, suffix?: string | null): string {
  return format
    .replace(/\{seq(?::(\d+))?\}/g, (_m, pad) => String(seq).padStart(pad ? Number(pad) : 0, '0'))
    .replace(/\{year\}/g, String(year))
    .replace(/\{suffix\}/g, suffix ? ` ${suffix}` : '');
}

/** Retrouve seq / année / suffixe d'un numéro imprimé d'après le format (null si le numéro ne suit pas le format). */
export function parseDocumentNumber(format: string, number: string): { seq: number; year: number | null; suffix: string | null } | null {
  const parts = format.split(/(\{seq(?::\d+)?\}|\{year\}|\{suffix\})/);
  let re = '';
  const groups: ('seq' | 'year' | 'suffix')[] = [];
  for (const p of parts) {
    if (/^\{seq/.test(p)) { re += '(\\d+)'; groups.push('seq'); }
    else if (p === '{year}') { re += '(\\d{4})'; groups.push('year'); }
    else if (p === '{suffix}') { re += '(?: ([A-Za-z0-9 ]+?))?'; groups.push('suffix'); }
    else re += escapeRe(p).replace(/\\? /g, '\\s*');
  }
  const m = new RegExp(`^\\s*${re}\\s*$`, 'i').exec(number);
  if (!m) return null;
  const out: { seq: number; year: number | null; suffix: string | null } = { seq: 0, year: null, suffix: null };
  groups.forEach((g, i) => {
    const v = m[i + 1];
    if (g === 'seq') out.seq = Number(v);
    else if (g === 'year') out.year = Number(v);
    else out.suffix = v ? v.trim() : null;
  });
  return out.seq > 0 ? out : null;
}

export async function getNumberFormats(): Promise<NumberFormats> {
  const row = await prisma.documentSettings.findUnique({ where: { id: 'default' } });
  const data = (row?.data ?? {}) as { numberFormats?: Partial<NumberFormats> };
  return { ...DEFAULT_SETTINGS.numberFormats, ...(data.numberFormats ?? {}) };
}

type Db = typeof prisma;

export async function getLastNumber(type: DocumentKind, year: number): Promise<number> {
  const c = await prisma.documentCounter.findUnique({ where: { type_year: { type, year } } });
  return c?.lastNumber ?? 0;
}

async function getFloor(type: DocumentKind, year: number, db: Db): Promise<number> {
  const c = await db.documentCounter.findUnique({ where: { type_year: { type, year } } });
  return c?.floor ?? 0;
}

/**
 * Numéros (seq) déjà pris pour un type et une année.
 *  – FACTURE : factures émises + numéros RÉSERVÉS sur les commandes / devis (même si la facture n'est pas encore générée) ;
 *  – BL      : BL « sans facture » seulement (les BL-F suivent le numéro de la facture) ;
 *  – PROFORMA: proformas émises.
 */
export async function takenSeqs(type: DocumentKind, year: number, formats: NumberFormats, db: Db = prisma): Promise<Set<number>> {
  const taken = new Set<number>();
  const docs = await db.document.findMany({
    where: { type, year, seq: { not: null }, ...(type === 'BL' ? { withInvoice: false } : {}) },
    select: { seq: true },
  });
  for (const d of docs) if (d.seq) taken.add(d.seq);
  if (type === 'FACTURE') {
    const where = { invoiceNumber: { contains: String(year) } };
    const [orders, quotes] = await Promise.all([
      db.order.findMany({ where, select: { invoiceNumber: true } }),
      db.quote.findMany({ where, select: { invoiceNumber: true } }),
    ]);
    for (const r of [...orders, ...quotes]) {
      const p = r.invoiceNumber ? parseDocumentNumber(formats.FACTURE, r.invoiceNumber) : null;
      if (p && (p.year ?? year) === year) taken.add(p.seq);
    }
  }
  return taken;
}

/** Plus petit numéro libre au-dessus du plancher du compteur. `reused` = il reste un numéro plus grand déjà pris (trou comblé). */
export async function nextFreeSeq(type: DocumentKind, year: number, formats: NumberFormats, db: Db = prisma): Promise<{ seq: number; reused: boolean }> {
  const floor = await getFloor(type, year, db);
  const taken = await takenSeqs(type, year, formats, db);
  let seq = floor + 1;
  while (taken.has(seq)) seq++;
  let max = 0;
  for (const n of taken) if (n > max) max = n;
  return { seq, reused: seq < max };
}

// Prochain numéro SANS le consommer (affichage / proposition).
export async function peekNextSeq(type: DocumentKind, year: number, formats?: NumberFormats): Promise<number> {
  return (await nextFreeSeq(type, year, formats ?? (await getNumberFormats()))).seq;
}

/** Proposition de numéro pour FACTURE / PROFORMA. */
export async function suggestNumber(type: 'FACTURE' | 'PROFORMA', year: number, formats?: NumberFormats) {
  const f = formats ?? (await getNumberFormats());
  const seq = await peekNextSeq(type, year, f);
  return { seq, suffix: null as string | null, number: formatDocumentNumber(f[type], seq, year) };
}

/** Candidats de suffixe pour plusieurs BL d'une même facture : (rien), « bis », « bis 2 », « bis 3 »… */
const suffixCandidates = (): (string | null)[] => [null, 'bis', ...Array.from({ length: 48 }, (_, i) => `bis ${i + 2}`)];

/**
 * Proposition de numéro pour un BL :
 *  – commande / devis AVEC facture (TVA, numéro réservé) → « BL-F » + le numéro de la facture ; s'il y a déjà un BL pour
 *    cette facture : « bis », « bis 2 »… (ils seront regroupés dans la même facture) ;
 *  – sinon → BL SANS facture : plus petit numéro libre de son propre compteur.
 */
export async function suggestBlNumber(year: number, src: { invoiceNumber?: string | null; vatEnabled?: boolean } | null, formats?: NumberFormats) {
  const f = formats ?? (await getNumberFormats());
  if (src?.vatEnabled && src.invoiceNumber) {
    const p = parseDocumentNumber(f.FACTURE, src.invoiceNumber);
    if (p) {
      const y = p.year ?? year;
      for (const suffix of suffixCandidates()) {
        const number = formatDocumentNumber(f.BL_FACTURE, p.seq, y, suffix);
        const pris = await prisma.document.findFirst({ where: { type: 'BL', number }, select: { id: true } });
        if (!pris) return { seq: p.seq, suffix, number, bis: !!suffix, withInvoice: true };
      }
    }
  }
  const { seq } = await nextFreeSeq('BL', year, f);
  return { seq, suffix: null as string | null, number: formatDocumentNumber(f.BL, seq, year), bis: false, withInvoice: false };
}

/** Numéro de facture proposé quand on facture un ou plusieurs BL : celui du (premier) BL « avec facture » s'il est libre, sinon le suivant libre. */
export async function suggestInvoiceNumberFromBls(year: number, bls: { seq: number | null; withInvoice: boolean }[], formats?: NumberFormats) {
  const f = formats ?? (await getNumberFormats());
  const seq = bls.filter((b) => b.withInvoice && b.seq).map((b) => b.seq as number).sort((a, b) => a - b)[0];
  if (seq) {
    const number = formatDocumentNumber(f.FACTURE, seq, year);
    const pris = await prisma.document.findFirst({ where: { type: 'FACTURE', number }, select: { id: true } });
    if (!pris) return { seq, suffix: null as string | null, number };
  }
  return suggestNumber('FACTURE', year, f);
}

/** Après l'émission d'un document : le compteur suit le plus grand numéro émis. */
export async function bumpCounter(type: DocumentKind, year: number, seq: number, db: Db = prisma) {
  const c = await db.documentCounter.findUnique({ where: { type_year: { type, year } } });
  if (!c) await db.documentCounter.create({ data: { type, year, lastNumber: seq } });
  else if (seq > c.lastNumber) await db.documentCounter.update({ where: { id: c.id }, data: { lastNumber: seq } });
}

// Réglage admin : « le dernier numéro utilisé est N » → le suivant sera N+1, et rien en dessous n'est réattribué (plancher).
export async function setLastNumber(type: DocumentKind, year: number, lastNumber: number) {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) throw new Error('Numéro invalide');
  return prisma.documentCounter.upsert({
    where: { type_year: { type, year } },
    create: { type, year, lastNumber, floor: lastNumber },
    update: { lastNumber, floor: lastNumber },
  });
}
