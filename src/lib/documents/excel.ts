// Export Excel d'un document (BL / facture / proforma) : même contenu que le PDF, avec xlsx-js-style (déjà dans le projet).
// Isomorphe : le navigateur l'utilise pour « Télécharger Excel », le serveur pour la pièce jointe du mail.
import { utils, write, type WorkBook, type CellObject } from 'xlsx-js-style';
import { montantEnLettres } from './amount-in-words';
import { fmtDate, fmtMoney } from './calc';
import { cellValue } from './render';
import type { DocParty, RenderableDocument, TemplateField } from './types';

const THIN = { style: 'thin', color: { rgb: '000000' } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

type Row = (string | number | null)[];

function partyRows(title: string, fields: TemplateField[], p: DocParty): Row[] {
  const get = (id: string) => ({ address: p.address, phone: p.phone, rc: p.rc, nif: p.nif, nis: p.nis, ai: p.ai, rib: p.rib } as Record<string, string | undefined>)[id] ?? '';
  const rows: Row[] = [[title, p.name]];
  for (const f of fields) {
    if (f.id === 'name' || !f.enabled) continue;
    const v = get(f.id);
    if (String(v).trim()) rows.push([f.label, String(v).replace(/\r?\n/g, ' ')]);
  }
  return rows;
}

export function documentFileName(d: RenderableDocument): string {
  return `${d.number.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()}.xlsx`;
}

export function buildDocumentWorkbook(d: RenderableDocument): WorkBook {
  const t = d.template;
  const { data } = d;
  const cols = t.columns.filter((c) => c.enabled);
  const nCols = Math.max(cols.length, 4);
  const rows: Row[] = [];
  const styles: { r: number; c: number; s: CellObject['s'] }[] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

  const push = (r: Row) => { rows.push(r); return rows.length - 1; };
  const bold = (r: number, c: number, extra: object = {}) => styles.push({ r, c, s: { font: { bold: true }, ...extra } });

  // Titre
  const rTitle = push([t.title]);
  merges.push({ s: { r: rTitle, c: 0 }, e: { r: rTitle, c: nCols - 1 } });
  styles.push({ r: rTitle, c: 0, s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } });
  push([]);

  // En-tête (N°, date, échéance, mode de règlement…)
  for (const f of t.headerFields.filter((x) => x.enabled)) {
    const v = f.id === 'number' ? d.number
      : f.id === 'date' ? fmtDate(data.date)
      : f.id === 'dueDate' ? fmtDate(data.dueDate)
      : f.id === 'validity' ? (data.validity ?? '')
      : f.id === 'paymentMethod' ? (data.paymentMethod ?? '')
      : (data.headerExtra?.[f.id] ?? f.defaultValue ?? '');
    if (!String(v).trim() && f.id !== 'number' && f.id !== 'date') continue;
    const r = push([f.label, v]);
    bold(r, 0); bold(r, 1);
  }
  push([]);

  // Parties
  for (const [on, title, fields, p] of [
    [t.partyA.enabled, t.partyA.title, t.partyA.fields, data.psi],
    [t.partyB.enabled, t.partyB.title, t.partyB.fields, data.client],
  ] as const) {
    if (!on) continue;
    partyRows(title, fields, p).forEach((row, i) => { const r = push(row); bold(r, 0); if (i === 0) bold(r, 1, {}); });
    push([]);
  }
  if (t.orderLine.enabled && data.orderDate) { push([`${t.orderLine.label} ${fmtDate(data.orderDate)}`]); push([]); }

  // Tableau
  const rHead = push(cols.map((c) => c.label));
  cols.forEach((_, c) => styles.push({ r: rHead, c, s: { font: { bold: true }, fill: { fgColor: { rgb: 'E3E3E3' } }, border: BORDER, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } } }));
  for (const l of data.lines) {
    const money = (c: string) => c === 'unitPrice' || c === 'amount';
    const r = push(cols.map((c) => {
      const v = cellValue(c, l, t);
      if (c.id === 'quantity') return Number(l.quantity) || 0;
      if (money(c.id)) return Number(v.replace(/\s/g, '').replace(',', '.')) || 0;
      return v;
    }));
    cols.forEach((c, ci) => styles.push({ r, c: ci, s: { border: BORDER, alignment: { vertical: 'center', wrapText: true, horizontal: c.id === 'designation' || c.id === 'observation' ? 'left' : 'center' }, ...(money(c.id) ? { numFmt: '#,##0.00' } : {}) } }));
  }

  // Totaux
  if (t.totals.enabled) {
    const tt = data.totals;
    const items: [string, number][] = [[t.totals.labelHt, tt.ht], [t.totals.labelVat, tt.vat], [t.totals.labelTtc, tt.ttc]];
    if (tt.stamp > 0) { items.push([t.totals.labelStamp, tt.stamp]); items.push(['NET À PAYER', tt.net]); }
    for (const [label, val] of items) {
      const r = push([...Array(nCols - 2).fill(null), label, val]);
      styles.push({ r, c: nCols - 2, s: { font: { bold: true }, border: BORDER } });
      styles.push({ r, c: nCols - 1, s: { font: { bold: true }, border: BORDER, numFmt: '#,##0.00', alignment: { horizontal: 'right' } } });
    }
    push([]);
  }
  if (t.amountInWords.enabled) {
    const r = push([`${t.amountInWords.label} ${montantEnLettres(data.totals.stamp > 0 ? data.totals.net : data.totals.ttc)}`]);
    merges.push({ s: { r, c: 0 }, e: { r, c: nCols - 1 } });
    styles.push({ r, c: 0, s: { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } } });
    push([]);
  }
  if (t.deliveryInfo.enabled) {
    if (data.deliveryDate) push([t.deliveryInfo.dateLabel, /^\d{4}-\d{2}-\d{2}/.test(data.deliveryDate) ? fmtDate(data.deliveryDate) : data.deliveryDate]);
    if (data.deliveryPlace) push([t.deliveryInfo.placeLabel, data.deliveryPlace]);
  }
  for (const f of t.customFields.filter((x) => x.enabled)) {
    const v = d.customFields?.[f.id] ?? f.defaultValue ?? '';
    if (String(v).trim()) push([f.label, v]);
  }
  const notes = (data.notes ?? '').trim() || (t.notes.enabled ? t.notes.text : '');
  if (notes.trim()) { push([]); push([notes]); }
  if (t.signatures.enabled) { push([]); const r = push([t.signatures.leftLabel, ...Array(nCols - 2).fill(null), t.signatures.rightLabel]); styles.push({ r, c: 0, s: { font: { underline: true } } }); }
  if (t.footer.enabled) {
    push([]);
    for (const l of (data.psiFooter?.length ? data.psiFooter : t.footer.lines)) {
      const r = push([l]);
      merges.push({ s: { r, c: 0 }, e: { r, c: nCols - 1 } });
      styles.push({ r, c: 0, s: { font: { italic: true, sz: 8 }, alignment: { horizontal: 'center' } } });
    }
  }

  const ws = utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = Array.from({ length: nCols }, (_, i) => {
    const c = cols[i];
    return { wch: c?.id === 'designation' ? 38 : c?.id === 'observation' ? 28 : c?.id === 'amount' ? 16 : c?.id === 'ref' ? 14 : 14 };
  });
  for (const { r, c, s } of styles) {
    const addr = utils.encode_cell({ r, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = { ...(ws[addr].s ?? {}), ...s };
  }
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, d.type === 'BL' ? 'Bon de livraison' : d.type === 'PROFORMA' ? 'Proforma' : 'Facture');
  return wb;
}

/** Contenu du fichier .xlsx (Buffer côté serveur, Uint8Array côté navigateur). */
export function documentExcelBuffer(d: RenderableDocument): Uint8Array {
  return write(buildDocumentWorkbook(d), { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
}

// `fmtMoney` ré-exporté pour les écrans qui affichent les mêmes montants.
export { fmtMoney };
