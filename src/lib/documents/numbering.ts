// Numérotation des documents : un compteur par type et par année, modifiable par les admins.
//  • FACTURE : « F 023/2026 », repart à 1 chaque année.
//  • BL      : essaie de COÏNCIDER avec la future facture (BL 23 ↔ F 23) ; si ce numéro est déjà pris par un BL
//              (plusieurs BL pour une même facture, ou BL avant la facture) → « bis » proposé, modifiable.
//  • PROFORMA: « FP-01-2026 », compteur propre.
// Le numéro imprimé (Document.number) fait foi ; seq/suffix ne servent qu'à proposer le suivant.
import { prisma } from '@/lib/prisma';
import { DEFAULT_SETTINGS } from './defaults';
import type { DocumentKind } from './types';

export type NumberFormats = Record<DocumentKind, string>;

// Remplace {seq}, {seq:3} (zéros à gauche), {year}, {suffix} (→ « ␣bis » ou rien)
export function formatDocumentNumber(format: string, seq: number, year: number, suffix?: string | null): string {
  return format
    .replace(/\{seq(?::(\d+))?\}/g, (_m, pad) => String(seq).padStart(pad ? Number(pad) : 0, '0'))
    .replace(/\{year\}/g, String(year))
    .replace(/\{suffix\}/g, suffix ? ` ${suffix}` : '');
}

export async function getNumberFormats(): Promise<NumberFormats> {
  const row = await prisma.documentSettings.findUnique({ where: { id: 'default' } });
  const data = (row?.data ?? {}) as { numberFormats?: Partial<NumberFormats> };
  return { ...DEFAULT_SETTINGS.numberFormats, ...(data.numberFormats ?? {}) };
}

// Prochain numéro SANS le consommer (affichage / proposition).
export async function peekNextSeq(type: DocumentKind, year: number): Promise<number> {
  const c = await prisma.documentCounter.findUnique({ where: { type_year: { type, year } } });
  return (c?.lastNumber ?? 0) + 1;
}

// Réserve le prochain numéro (incrémente le compteur, saute les numéros déjà pris — ex. saisis à la main).
export async function reserveNextNumber(type: DocumentKind, year: number, formats?: NumberFormats) {
  const fmt = (formats ?? (await getNumberFormats()))[type];
  for (let essai = 0; essai < 50; essai++) {
    const c = await prisma.documentCounter.upsert({
      where: { type_year: { type, year } },
      create: { type, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
    const number = formatDocumentNumber(fmt, c.lastNumber, year);
    const pris = await prisma.document.findUnique({ where: { type_number: { type, number } }, select: { id: true } });
    if (!pris) return { seq: c.lastNumber, number };
  }
  throw new Error('Impossible de réserver un numéro de document');
}

// Proposition de numéro pour un BL : même numéro que la prochaine facture ; « bis », « bis 2 »… s'il est déjà pris.
export async function suggestBlNumber(year: number, formats?: NumberFormats) {
  const fmt = (formats ?? (await getNumberFormats())).BL;
  const seq = await peekNextSeq('FACTURE', year);
  const existants = await prisma.document.findMany({ where: { type: 'BL', year, seq }, select: { suffix: true } });
  let suffix: string | null = null;
  if (existants.length > 0) suffix = existants.length === 1 ? 'bis' : `bis ${existants.length}`;
  return { seq, suffix, number: formatDocumentNumber(fmt, seq, year, suffix) };
}

// Réglage admin : « le dernier numéro utilisé est N » → le suivant sera N+1.
export async function setLastNumber(type: DocumentKind, year: number, lastNumber: number) {
  if (!Number.isInteger(lastNumber) || lastNumber < 0) throw new Error('Numéro invalide');
  return prisma.documentCounter.upsert({ where: { type_year: { type, year } }, create: { type, year, lastNumber }, update: { lastNumber } });
}
