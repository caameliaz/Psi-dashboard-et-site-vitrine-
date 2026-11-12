// Numérotation des documents : un compteur par type et par année, modifiable par les admins.
//  • FACTURE : « F 023/2026 », repart à 1 chaque année.
//  • BL      : essaie de COÏNCIDER avec la future facture (BL 23 ↔ F 23). Si le même client a déjà un BL
//              « à facturer », le nouveau BL prend le même numéro avec « bis » (ils seront regroupés en une facture).
//  • PROFORMA: « FP-01-2026 », compteur propre.
// Le compteur = le plus GRAND numéro émis (ou saisi par un admin) : le suivant est N+1.
// Le numéro imprimé (Document.number) fait foi ; seq/suffix ne servent qu'à proposer le suivant.
import { prisma } from '@/lib/prisma';
import { DEFAULT_SETTINGS } from './defaults';
import type { DocumentKind } from './types';

export type NumberFormats = Record<DocumentKind, string>;

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

export async function getLastNumber(type: DocumentKind, year: number): Promise<number> {
  const c = await prisma.documentCounter.findUnique({ where: { type_year: { type, year } } });
  return c?.lastNumber ?? 0;
}

// Prochain numéro SANS le consommer (affichage / proposition) : saute les numéros déjà pris.
export async function peekNextSeq(type: DocumentKind, year: number, formats?: NumberFormats): Promise<number> {
  const fmt = (formats ?? (await getNumberFormats()))[type];
  let seq = (await getLastNumber(type, year)) + 1;
  for (let i = 0; i < 200; i++) {
    const pris = await prisma.document.findFirst({ where: { type, number: formatDocumentNumber(fmt, seq, year) }, select: { id: true } });
    if (!pris) return seq;
    seq++;
  }
  return seq;
}

/** Proposition de numéro pour FACTURE / PROFORMA. */
export async function suggestNumber(type: 'FACTURE' | 'PROFORMA', year: number, formats?: NumberFormats) {
  const f = formats ?? (await getNumberFormats());
  const seq = await peekNextSeq(type, year, f);
  return { seq, suffix: null as string | null, number: formatDocumentNumber(f[type], seq, year) };
}

/**
 * Proposition de numéro pour un BL :
 *  – le même client a déjà un BL « à facturer » → même numéro + « bis » (« bis 2 »…) : ils seront regroupés ;
 *  – sinon le plus grand entre le prochain n° de facture et le dernier BL + 1 (les BL et les factures restent alignés).
 */
export async function suggestBlNumber(year: number, clientId?: string | null, formats?: NumberFormats) {
  const f = formats ?? (await getNumberFormats());
  if (clientId) {
    const pending = await prisma.document.findMany({
      where: { type: 'BL', year, clientId, invoiceId: null, seq: { not: null } },
      select: { seq: true },
      orderBy: { createdAt: 'desc' },
    });
    if (pending.length > 0) {
      const seq = pending[0].seq as number;
      const same = await prisma.document.count({ where: { type: 'BL', year, seq } });
      const suffix = same <= 1 ? 'bis' : `bis ${same}`;
      return { seq, suffix: suffix as string | null, number: formatDocumentNumber(f.BL, seq, year, suffix), bis: true };
    }
  }
  const nextFacture = await peekNextSeq('FACTURE', year, f);
  let seq = Math.max(nextFacture, (await getLastNumber('BL', year)) + 1);
  for (let i = 0; i < 200; i++) {
    const pris = await prisma.document.findFirst({ where: { type: 'BL', year, seq }, select: { id: true } });
    if (!pris) break;
    seq++;
  }
  return { seq, suffix: null as string | null, number: formatDocumentNumber(f.BL, seq, year), bis: false };
}

/** Numéro de facture proposé quand on facture un ou plusieurs BL : celui du (premier) BL s'il est libre, sinon le suivant. */
export async function suggestInvoiceNumberFromBls(year: number, blSeqs: (number | null)[], formats?: NumberFormats) {
  const f = formats ?? (await getNumberFormats());
  const seq = blSeqs.filter((s): s is number => !!s).sort((a, b) => a - b)[0];
  if (seq) {
    const number = formatDocumentNumber(f.FACTURE, seq, year);
    const pris = await prisma.document.findFirst({ where: { type: 'FACTURE', number }, select: { id: true } });
    if (!pris) return { seq, suffix: null as string | null, number };
  }
  return suggestNumber('FACTURE', year, f);
}

/** Après l'émission d'un document : le compteur suit le plus grand numéro émis. */
export async function bumpCounter(type: DocumentKind, year: number, seq: number) {
  const c = await prisma.documentCounter.findUnique({ where: { type_year: { type, year } } });
  if (!c) await prisma.documentCounter.create({ data: { type, year, lastNumber: seq } });
  else if (seq > c.lastNumber) await prisma.documentCounter.update({ where: { id: c.id }, data: { lastNumber: seq } });
}

// Réglage admin : « le dernier numéro utilisé est N » → le suivant sera N+1.
export async function setLastNumber(type: DocumentKind, year: number, lastNumber: number) {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) throw new Error('Numéro invalide');
  return prisma.documentCounter.upsert({ where: { type_year: { type, year } }, create: { type, year, lastNumber }, update: { lastNumber } });
}
