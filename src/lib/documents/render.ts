// Moteur de rendu unique des documents (BL / facture / proforma) : modèle + contenu → HTML A4.
// Utilisé pour : l'aperçu dans Réglages → Documents, l'impression (« Enregistrer en PDF »), la page publique envoyée au client.
// Pur (aucune dépendance serveur/navigateur) : le QR est fourni déjà généré (SVG).
// Mise en page : bandeau aux couleurs du logo (vert → bleu), en-tête société, titre + cadre d'infos, cartes Entreprise / Client,
// tableau à en-tête foncé, totaux avec ligne finale mise en valeur, pied de page. Le CONTENU (textes, colonnes, totaux) vient du modèle.
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
:root{--blue:#1769b3;--navy:#12355b;--ink:#1c2733;--muted:#5d6b7a;--line:#d3dce6;--soft:#f4f7fa}
body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:var(--ink)}
.page{width:210mm;min-height:297mm;margin:0 auto;padding:12mm 14mm 10mm;display:flex;flex-direction:column;background:#fff}
.top{display:flex;align-items:center;gap:7mm;padding:0 0 5mm}
.logo{height:26mm;width:26mm;object-fit:contain;display:block;flex:none}
.company{flex:1;min-width:0;border-left:.3mm solid var(--line);padding-left:5mm}
.company .cn{font-size:14pt;font-weight:700;color:var(--navy);line-height:1.15}
.company .ca{margin-top:1.5mm;font-size:8pt;color:var(--muted);line-height:1.55}
.company .ca b{color:var(--ink);font-weight:600}
.qrbox{display:flex;align-items:center;gap:2mm;font-size:6.5pt;font-weight:700;text-align:right;line-height:1.25;color:var(--navy)}
.qrbox svg{width:22mm;height:22mm;display:block}
.rule{border-top:.3mm solid var(--navy);margin:0 0 6mm}
.titlerow{display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;margin-bottom:6mm}
.title{font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:19pt;letter-spacing:.2mm;color:var(--navy);line-height:1.1;text-transform:uppercase}
.meta{width:80mm;font-size:8.5pt;background:#fff;border:.25mm solid var(--line);border-radius:2mm;padding:2.5mm 4mm}
.meta table{border-collapse:collapse;width:100%}
.meta td{padding:.7mm 0;vertical-align:top;font-weight:700;color:var(--ink)}
.meta td.k{width:54%;font-weight:600;color:var(--muted)}
.parties{display:flex;justify-content:space-between;gap:8mm;margin-bottom:6mm}
.party{border:.25mm solid var(--line);border-radius:2mm;width:49%;padding:3mm 3.5mm;min-height:24mm;font-size:8pt;background:#fff}
.party table{border-collapse:collapse;width:100%}
.party td{vertical-align:top;padding:.4mm 0}
.party td.pl{width:22mm;font-weight:700;white-space:nowrap;color:var(--navy)}
.party td.pv.name{font-weight:700;font-size:10.5pt;color:var(--navy)}
.orderline{font-size:8pt;margin:0 0 2.5mm;color:var(--muted);font-weight:600}
table.lines{width:100%;border-collapse:collapse;font-size:8pt;border:.25mm solid var(--line)}
table.lines th{background:#eceff3;color:var(--navy);border:.25mm solid var(--line);padding:2mm 1.5mm;font-weight:700;text-align:center;font-size:7.5pt}
table.lines td{border:.25mm solid var(--line);padding:1.8mm 2mm;text-align:center;vertical-align:middle}
table.lines td.designation{text-align:left;line-height:1.45}
table.lines td.num{text-align:right}
table.lines td.amount{text-align:right;font-weight:700;color:var(--navy)}
table.lines td.observation{text-align:left}
table.lines tr{page-break-inside:avoid}
table.lines thead{display:table-header-group}
table.lines tr.sp td{border:none;padding:0;height:0}
.totals{margin:4mm 0 0 auto;width:50%;border-collapse:separate;border-spacing:0;font-size:9pt;page-break-inside:avoid;border:.25mm solid var(--line);border-radius:2mm;overflow:hidden}
.totals td{border-bottom:.25mm solid var(--line);padding:1.8mm 3mm;font-weight:600;background:#fff}
.totals td.v{text-align:right;width:46%;font-weight:700}
.totals tr:last-child td{border-bottom:none;color:var(--navy);font-weight:800;font-size:10pt}
.words{margin-top:8mm;border:.25mm solid var(--line);border-radius:1.5mm;background:#fff;padding:2.5mm 3.5mm;width:78%;font-size:8.5pt;font-weight:700;line-height:1.4;color:var(--navy);page-break-inside:avoid}
.words u{font-weight:600;color:var(--muted);text-decoration:none}
.info{margin-top:6mm;font-size:8.5pt;line-height:1.8;padding:2.5mm 3.5mm;border:.25mm solid var(--line);border-radius:2mm;background:#fff;width:max-content;max-width:100%}
.info b{font-weight:700;color:var(--navy)}
.extra{margin-top:5mm;font-size:8pt;line-height:1.6}
.extra b{font-weight:700;color:var(--navy)}
.notes{margin-top:5mm;font-size:8pt;line-height:1.5;white-space:pre-line;color:var(--muted)}
.sign{display:flex;justify-content:space-between;gap:10mm;margin-top:9mm;font-size:8pt;page-break-inside:avoid}
.sign span{flex:1;min-height:28mm;border:.25mm dashed #aab6c3;border-radius:2mm;padding:2mm 3mm;font-weight:700;color:var(--navy);font-size:8pt}
.sign span:last-child{text-align:right}
.spacer{flex:1;min-height:6mm}
.footer{margin-top:8mm;text-align:center;font-size:6.8pt;line-height:1.7;color:var(--muted);border-top:.25mm solid var(--line);padding:3mm 4mm 0;page-break-inside:avoid}
.footer.plain{font-weight:600}
@media print{@page{size:A4;margin:0}.page{margin:0}}
`;

/** Corps HTML (sans <html>) d'un document. */
export function renderDocumentBody(d: RenderableDocument, origin = ''): string {
  const t = d.template;
  const { data } = d;
  const isBl = d.type === 'BL';

  const logo = t.showLogo ? `<img class="logo" src="${origin}${LOGO_PATH}" alt="PSI">` : '';
  // Bloc société de l'en-tête : mêmes informations que la fiche « Entreprise » (nom, adresse, téléphone), simplement mises en page.
  const psi = data.psi;
  const psiAddr = String(psi?.address ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).join(', ');
  const company = psi?.name
    ? `<div class="company"><div class="cn">${esc(psi.name)}</div><div class="ca">${psiAddr ? `${esc(psiAddr)}<br>` : ''}${psi.phone ? `Tél. <b>${esc(psi.phone)}</b>` : ''}</div></div>`
    : '<div class="company"></div>';
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
    ? `<div class="sign"><span>${esc(t.signatures.leftLabel)}</span><span>${esc(t.signatures.rightLabel)}</span></div>` : '';

  const footerLines = data.psiFooter?.length ? data.psiFooter : t.footer.lines;
  const footer = t.footer.enabled && footerLines.length
    ? `<div class="footer ${isBl ? 'plain' : ''}">${footerLines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>` : '';

  return `<div class="page">
  <div class="top">${logo}${company}${qr}</div>
  <div class="rule"></div>
  <div class="titlerow"><div class="title">${esc(t.title)}</div>${metaRows ? `<div class="meta"><table>${metaRows}</table></div>` : ''}</div>
  ${parties}${orderLine}${table}${totals}${words}${info}${extras ? `<div class="extra">${extras}</div>` : ''}${notes}${sign}
  <div class="spacer"></div>
  ${footer}
</div>`;
}

/** Page HTML complète (aperçu dans une iframe, impression, page publique). */
export function renderDocumentHtml(d: RenderableDocument, opts: { origin?: string; title?: string } = {}): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title ?? d.number)}</title><style>${DOCUMENT_CSS}</style></head><body>${renderDocumentBody(d, opts.origin ?? '')}</body></html>`;
}
