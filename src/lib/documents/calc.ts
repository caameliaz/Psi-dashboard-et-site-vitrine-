// Calculs communs (serveur + navigateur) : arrondis, totaux, timbre, dates, fusion modèle/réglages.
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from './defaults';
import { stampDuty, type StampDutyConfig } from './stamp-duty';
import type { DocLine, DocTotals, DocumentKind, DocumentSettingsData, DocumentTemplateConfig } from './types';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 298560 → « 298 560,00 » (espaces fines insécables remplacées par des espaces simples pour l'impression / Excel). */
export function fmtMoney(n: number): string {
  return round2(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, ' ');
}
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
}
/** ISO ou Date → « 08/11/2026 ». */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export const isCash = (paymentMethod: string | null | undefined) => /esp[eè]ces?/i.test(paymentMethod ?? '');

/** Totaux d'une facture / proforma : HT, TVA, TTC, timbre (si espèces), net à payer. */
export function computeTotals(lines: Pick<DocLine, 'quantity' | 'unitPrice'>[], vatRate: number, paymentMethod: string, stamp: StampDutyConfig): DocTotals {
  const ht = round2(lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0));
  const vat = round2((ht * vatRate) / 100);
  const ttc = round2(ht + vat);
  const st = isCash(paymentMethod) ? stampDuty(ttc, stamp) : 0;
  return { ht, vat, ttc, stamp: st, net: round2(ttc + st) };
}

export const lineAmount = (l: Pick<DocLine, 'quantity' | 'unitPrice'>) => round2((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0));

// ── Fusion « enregistré + défauts » (les nouveaux champs ajoutés plus tard au modèle d'origine ne cassent rien) ──
export function mergeSettings(saved: unknown): DocumentSettingsData {
  const s = (saved ?? {}) as Partial<DocumentSettingsData>;
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    psi: { ...DEFAULT_SETTINGS.psi, ...(s.psi ?? {}) },
    stampDuty: { ...DEFAULT_SETTINGS.stampDuty, ...(s.stampDuty ?? {}), tiers: s.stampDuty?.tiers?.length ? s.stampDuty.tiers : DEFAULT_SETTINGS.stampDuty.tiers },
    numberFormats: { ...DEFAULT_SETTINGS.numberFormats, ...(s.numberFormats ?? {}) },
  };
}

export function mergeTemplate(type: DocumentKind, saved: unknown): DocumentTemplateConfig {
  const d = DEFAULT_TEMPLATES[type];
  const s = (saved ?? {}) as Partial<DocumentTemplateConfig>;
  return {
    ...d,
    ...s,
    partyA: { ...d.partyA, ...(s.partyA ?? {}) },
    partyB: { ...d.partyB, ...(s.partyB ?? {}) },
    orderLine: { ...d.orderLine, ...(s.orderLine ?? {}) },
    totals: { ...d.totals, ...(s.totals ?? {}) },
    amountInWords: { ...d.amountInWords, ...(s.amountInWords ?? {}) },
    deliveryInfo: { ...d.deliveryInfo, ...(s.deliveryInfo ?? {}) },
    signatures: { ...d.signatures, ...(s.signatures ?? {}) },
    notes: { ...d.notes, ...(s.notes ?? {}) },
    footer: { ...d.footer, ...(s.footer ?? {}) },
    headerFields: s.headerFields ?? d.headerFields,
    columns: s.columns ?? d.columns,
    customFields: s.customFields ?? d.customFields,
  };
}
