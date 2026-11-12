// Moteur de rendu unique des documents (BL / facture / proforma) : modèle + contenu → HTML A4 fidèle aux PDF de PSI.
// Utilisé pour : l'aperçu dans Réglages → Documents, l'impression (« Enregistrer en PDF »), la page publique envoyée au client.
// Pur (aucune dépendance serveur/navigateur) : le QR est fourni déjà généré (SVG).
import { montantEnLettres } from './amount-in-words';
import { fmtDate, fmtMoney, lineAmount } from './calc';
import type { DocLine, DocParty, DocumentTemplateConfig, RenderableDocument, TemplateColumn, TemplateField } from './types';

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const multi = (s: unknown) => esc(s).replace(/\r?\n/g, '<br>');

export const LOGO_PATH = '/Logo%20PSI-avectexte.jpeg';

/** Valeur affichée d'une cellule du tableau. */
export function cellValue(col: TemplateColumn, l: DocLine, template: DocumentTemplateConfig): string {
  switch (col.id) {
    case 'ref': return l.ref;
    case 'designation': return l.designation;
    case 'laize': {
      // Bon de livraison sans colonne « Métrage » : la laize s'écrit « 57/41 metres », comme sur le BL d'origine.
      const hasMetrageCol = template.columns.some((c) => c.id === 'metrage' && c.enabled);
      return !hasMetrageCol && l.metrage ? `${l.laize}/${l.metrage} metres` : l.laize;
    }
    case 'metrage': return l.metrage;
    case 'quantity': return String(l.quantity ?? '');
    case 'unitPrice': return fmtMoney(l.unitPrice);
    case 'amount': return fmtMoney(lineAmount(l));
    case 'observation': return l.observation;
    default: return l.custom?.[col.id] ?? '';
  }
}

function headerValue(f: TemplateField, d: RenderableDocument): string {
  const { data } = d;
  switch (f.id) {
    case 'number': return d.number;
    case 'date': return fmtDate(data.date);
    case 'dueDate': return fmtDate(data.dueDate);
    case 'validity': return data.validity ?? '';
    case 'paymentMethod': return data.paymentMethod ?? '';
    default: return data.headerExtra?.[f.id] ?? f.defaultValue ?? '';
  }
}

function partyValue(id: string, p: DocParty): string {
  switch (id) {
    case 'address': return p.address ?? '';
    case 'phone': return p.phone ?? '';
    case 'rc': return p.rc ?? '';
    case 'nif': return p.nif ?? '';
    case 'nis': return p.nis ?? '';
    case 'ai': return p.ai ?? '';
    case 'rib': return p.rib ?? '';
    default: return '';
  }
}

function partyBox(title: string, fields: TemplateField[], p: DocParty): string {
  const nameField = fields.find((f) => f.id === 'name');
  const rows: string[] = [];
  if (!nameField || nameField.enabled) rows.push(`<tr><td class="pl">${esc(title)}</td><td class="pv name">${esc(p.name)}</td></tr>`);
  for (const f of fields) {
    if (f.id === 'name' || !f.enabled) continue;
    const v = partyValue(f.id, p);
    // Une ligne sans valeur (ex. client sans AI) est masquée plutôt qu'affichée vide.
    if (!String(v).trim()) continue;
    rows.push(`<tr><td class="pl">${esc(f.label)}</td><td class="pv">${multi(v)}</td></tr>`);
  }
  return `<div class="party"><table>${rows.join('')}</table></div>`;
}

export const DOCUMENT_CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{background:#fff}
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#000}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 14mm 10mm;display:flex;flex-direction:column;background:#fff}
.top{display:flex;justify-content:space-between;align-items:flex-end;min-height:26mm}
.logo{height:24mm;width:auto;display:block}
.qrbox{display:flex;align-items:center;gap:2mm;font-size:6.5pt;font-weight:700;text-align:right;line-height:1.25}
.qrbox svg{width:22mm;height:22mm;display:block}
.rule{border-top:.45mm solid #000;margin:2mm 0 4mm}
.title{font-weight:700;font-size:12pt;text-align:center;letter-spacing:.2mm}
.title.boxed{border:.3mm solid #000;background:#e3e3e3;padding:1mm 0}
.meta{margin:9mm 0 7mm auto;width:78mm;font-size:8pt}
.meta table{border-collapse:collapse;width:100%}
.meta td{padding:.2mm 0;font-weight:700;vertical-align:top}
.meta td.k{width:52%}
.parties{display:flex;justify-content:space-between;gap:12mm;margin-bottom:6mm}
.party{border:.3mm solid #000;width:48%;padding:1mm 1.5mm;min-height:22mm;font-size:7.5pt}
.party table{border-collapse:collapse;width:100%}
.party td{vertical-align:top;padding:.2mm 0}
.party td.pl{width:22mm;font-weight:700;white-space:nowrap}
.party td.pv.name{font-weight:700;font-size:10pt}
.orderline{font-size:7.5pt;margin:0 0 2mm 1mm}
table.lines{width:100%;border-collapse:collapse;font-size:7.5pt}
table.lines th{background:#e3e3e3;border:.3mm solid #000;padding:1mm 1mm;font-weight:700;text-align:center;font-size:7.5pt}
table.lines td{border:.3mm solid #000;padding:1mm 1.5mm;text-align:center;vertical-align:middle}
table.lines td.designation{text-align:left}
table.lines td.num{text-align:right}
table.lines td.amount{text-align:right;font-weight:700}
table.lines td.observation{text-align:left}
table.lines tr{page-break-inside:avoid}
table.lines thead{display:table-header-group}
table.lines tr.sp td{border:none;padding:0;height:0}
.totals{margin:0 0 0 auto;width:48%;border-collapse:collapse;font-size:8.5pt;page-break-inside:avoid}
.totals td{border:.3mm solid #000;padding:1mm 1.5mm;font-weight:700}
.totals td.v{text-align:right;width:46%}
.words{margin-top:14mm;border:.3mm solid #000;padding:1.5mm 2mm;width:75%;font-size:8.5pt;font-weight:700;line-height:1.35;page-break-inside:avoid}
.words u{font-weight:700}
.info{margin-top:6mm;font-size:8pt;line-height:1.7}
.info b{font-weight:700}
.extra{margin-top:5mm;font-size:8pt;line-height:1.6}
.extra b{font-weight:700}
.notes{margin-top:5mm;font-size:8pt;line-height:1.4;white-space:pre-line}
.sign{display:flex;justify-content:space-between;margin-top:9mm;font-size:8pt;text-decoration:underline;page-break-inside:avoid}
.sign span{min-width:40mm}
.sign.signbox{min-height:30mm}
.spacer{flex:1;min-height:6mm}
.footer{margin-top:8mm;text-align:center;font-size:6.5pt;font-style:italic;line-height:1.7;border:.25mm solid #bbb;padding:2mm 4mm;page-break-inside:avoid}
.footer.plain{border:none;font-style:normal;font-weight:700}
@media print{@page{size:A4;margin:0}.page{margin:0}}
`;

/** Corps HTML (sans <html>) d'un document. */
export function renderDocumentBody(d: RenderableDocument, origin = ''): string {
  const t = d.template;
  const { data } = d;
  const isBl = d.type === 'BL';

  const logo = t.showLogo ? `<img class="logo" src="${origin}${LOGO_PATH}" alt="PSI">` : '<div></div>';
  const qr = isBl && t.showQr && data.showQr !== false && d.qrSvg
    ? `<div class="qrbox"><div>Scannez à la réception<br>pour confirmer la livraison</div>${d.qrSvg}</div>` : '';

  const metaRows = t.headerFields
    .filter((f) => f.enabled)
    .map((f) => ({ f, v: headerValue(f, d) }))
    .filter(({ f, v }) => v.trim() !== '' || f.id === 'number' || f.id === 'date')
    .map(({ f, v }) => `<tr><td class="k">${esc(f.label)}</td><td>${esc(v)}</td></tr>`)
    .join('');

  const parties = (t.partyA.enabled || t.partyB.enabled)
    ? `<div class="parties">${t.partyA.enabled ? partyBox(t.partyA.title, t.partyA.fields, data.psi) : '<div></div>'}${t.partyB.enabled ? partyBox(t.partyB.title, t.partyB.fields, data.client) : '<div></div>'}</div>`
    : '';

  const orderLine = t.orderLine.enabled && data.orderDate ? `<div class="orderline">${esc(t.orderLine.label)} ${esc(fmtDate(data.orderDate))}</div>` : '';

  const cols = t.columns.filter((c) => c.enabled);
  const head = cols.map((c) => `<th class="${esc(c.id)}">${esc(c.label)}</th>`).join('');
  const body = data.lines.map((l) => `<tr>${cols.map((c) => {
    const v = cellValue(c, l, t);
    const cls = c.id === 'designation' ? 'designation' : c.id === 'amount' ? 'amount' : c.id === 'unitPrice' ? 'num' : c.id === 'observation' ? 'observation' : '';
    return `<td class="${cls}">${c.id === 'designation' || c.id === 'observation' ? multi(v) : esc(v)}</td>`;
  }).join('')}</tr>`).join('');
  const table = `<table class="lines"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;

  let totals = '';
  if (t.totals.enabled) {
    const tt = data.totals;
    const rows = [
      `<tr><td>${esc(t.totals.labelHt)}</td><td class="v">${fmtMoney(tt.ht)}</td></tr>`,
      `<tr><td>${esc(t.totals.labelVat)}</td><td class="v">${fmtMoney(tt.vat)}</td></tr>`,
      `<tr><td>${esc(t.totals.labelTtc)}</td><td class="v">${fmtMoney(tt.ttc)}</td></tr>`,
    ];
    if (tt.stamp > 0) {
      rows.push(`<tr><td>${esc(t.totals.labelStamp)}</td><td class="v">${fmtMoney(tt.stamp)}</td></tr>`);
      rows.push(`<tr><td>NET À PAYER</td><td class="v">${fmtMoney(tt.net)}</td></tr>`);
    }
    totals = `<table class="totals">${rows.join('')}</table>`;
  }

  const words = t.amountInWords.enabled
    ? `<div class="words"><u>${esc(t.amountInWords.label)}</u> ${esc(montantEnLettres(data.totals.stamp > 0 ? data.totals.net : data.totals.ttc))}</div>` : '';

  const info = t.deliveryInfo.enabled && (data.deliveryDate || data.deliveryPlace)
    ? `<div class="info">${data.deliveryDate ? `<div><b>${esc(t.deliveryInfo.dateLabel)}</b> ${esc(/^\d{4}-\d{2}-\d{2}/.test(data.deliveryDate) ? fmtDate(data.deliveryDate) : data.deliveryDate)}</div>` : ''}${data.deliveryPlace ? `<div><b>${esc(t.deliveryInfo.placeLabel)}</b> ${esc(data.deliveryPlace)}</div>` : ''}</div>` : '';

  const extras = t.customFields
    .filter((f) => f.enabled)
    .map((f) => ({ f, v: d.customFields?.[f.id] ?? f.defaultValue ?? '' }))
    .filter(({ v }) => String(v).trim() !== '')
    .map(({ f, v }) => `<div><b>${esc(f.label)}</b> ${esc(v)}</div>`)
    .join('');

  const notesTxt = (data.notes ?? '').trim() || (t.notes.enabled ? t.notes.text : '');
  const notes = (t.notes.enabled || data.notes) && notesTxt.trim() ? `<div class="notes">${esc(notesTxt)}</div>` : '';

  const sign = t.signatures.enabled
    ? `<div class="sign"><span>${esc(t.signatures.leftLabel)}</span><span style="text-align:right">${esc(t.signatures.rightLabel)}</span></div>` : '';

  const footerLines = data.psiFooter?.length ? data.psiFooter : t.footer.lines;
  const footer = t.footer.enabled && footerLines.length
    ? `<div class="footer ${isBl ? 'plain' : ''}">${footerLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>` : '';

  return `<div class="page">
  <div class="top">${logo}${qr}</div>
  <div class="rule"></div>
  <div class="title ${isBl ? '' : 'boxed'}">${esc(t.title)}</div>
  ${metaRows ? `<div class="meta"><table>${metaRows}</table></div>` : '<div style="height:7mm"></div>'}
  ${parties}${orderLine}${table}${totals}${words}${info}${extras ? `<div class="extra">${extras}</div>` : ''}${notes}${sign}
  <div class="spacer"></div>
  ${footer}
</div>`;
}

/** Page HTML complète (aperçu dans une iframe, impression, page publique). */
export function renderDocumentHtml(d: RenderableDocument, opts: { origin?: string; title?: string } = {}): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title ?? d.number)}</title><style>${DOCUMENT_CSS}</style></head><body>${renderDocumentBody(d, opts.origin ?? '')}</body></html>`;
}
