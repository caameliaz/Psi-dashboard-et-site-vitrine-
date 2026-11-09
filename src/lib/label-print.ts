import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────────────────────────────
// Étiquette colis PSI (100 × 100 mm, d'après « Carton MOON MOBIL 57-60 METRES-64 rlx.pdf ») + QR code
// « Valider la réception ». Impression par une fenêtre dédiée (même principe que les PDF de commande).
// ─────────────────────────────────────────────────────────────────────────────

export type LabelFormat = 'a4' | 'adhesive' | 'thermal';

export const LABEL_FORMATS: { value: LabelFormat; label: string; hint: string }[] = [
  { value: 'a4', label: 'A4', hint: '4 étiquettes par page (100×100 mm), à découper' },
  { value: 'adhesive', label: 'Étiquettes adhésives', hint: '1 étiquette de 100×100 mm par page' },
  { value: 'thermal', label: 'Imprimante thermique', hint: '1 étiquette par page de 100×150 mm' },
];

export interface LabelData {
  id: string;
  ref: string;
  token: string;
  count: number;
  titleFr: string;
  titleAr: string;
  lines: { designation: string; laize: string; grammage: string; mandrin: string; metres: string; quantite: number; productId?: string | null; askable?: boolean }[];
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** URL encodée dans le QR : le domaine du site (en local, l'adresse locale pour pouvoir tester le scan). */
export function receiptUrl(token: string, siteUrl: string): string {
  const local = typeof window !== 'undefined' && /^(localhost|127\.|192\.168\.)/.test(window.location.hostname);
  return `${local ? window.location.origin : siteUrl}/r/${token}`;
}

/** QR code en SVG (chaîne) — utilisé sur l'étiquette et dans l'aperçu du détail. */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
}

const MAX_ROWS = 8;

function labelHtml(d: LabelData, index: number, qr: string, origin: string): string {
  const shown = d.lines.slice(0, MAX_ROWS);
  const extra = d.lines.length - shown.length;
  const density = d.lines.length <= 3 ? '' : d.lines.length <= 5 ? 'c1' : 'c2';
  // Une colonne sans AUCUNE valeur (grammage, mandrin) est masquée au lieu d'afficher des « — ».
  const hasVal = (v: string) => v.trim() !== '' && v.trim() !== '—';
  const showGr = d.lines.some((l) => hasVal(l.grammage));
  const showMa = d.lines.some((l) => hasVal(l.mandrin));
  const nbCols = 3 + (showGr ? 1 : 0) + (showMa ? 1 : 0);
  const rows = shown.map((l) => `<tr><td>${esc(l.laize)}</td>${showGr ? `<td>${esc(l.grammage)}</td>` : ''}${showMa ? `<td>${esc(l.mandrin)}</td>` : ''}<td>${esc(l.metres)}</td><td>${esc(l.quantite)}</td></tr>`).join('');
  const more = extra > 0 ? `<tr><td colspan="${nbCols}" class="more">+ ${extra} autre${extra > 1 ? 's' : ''} ligne${extra > 1 ? 's' : ''} — détail via le QR code</td></tr>` : '';
  return `
  <div class="label ${density}">
    <div class="t1">${esc(d.titleFr)}</div>
    ${d.titleAr ? `<div class="t2" dir="rtl">${esc(d.titleAr)}</div>` : ''}
    <div class="mid">
      <img class="logo" src="${origin}/label/logo-psi-noir.png" alt="PSI">
      <div class="right">
        <div class="qr">${qr}</div>
        <div class="qrtxt">Scannez à la réception<br>pour confirmer la livraison</div>
      </div>
    </div>
    <table>
      <thead><tr><th>Laize<br>(mm)</th>${showGr ? '<th>Grammage<br>(g/m²)</th>' : ''}${showMa ? '<th>Mandrin Ø<br>(mm)</th>' : ''}<th>Mètres<br>(m)</th><th>Nbre<br>Rouleaux</th></tr></thead>
      <tbody>${rows}${more}</tbody>
    </table>
    <div class="addr">Centre des affaires El Qods - Cheraga- ALGER<br>Tél: 0770169060 &nbsp; email: contact@psi.dz</div>
    <div class="refline">N° ${esc(d.ref)}${d.count > 1 ? ` · Colis ${index}/${d.count}` : ''}</div>
  </div>`;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Open Sans','Segoe UI',Tahoma,Arial,sans-serif;color:#000}
.label{width:100mm;height:100mm;padding:3.5mm 4mm 3mm;display:flex;flex-direction:column;overflow:hidden;background:#fff}
.t1{font-weight:800;font-size:3.7mm;text-align:center;line-height:1.15}
.t2{font-weight:800;font-size:4mm;text-align:center;line-height:1.2;margin-top:.4mm;unicode-bidi:plaintext}
.mid{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;margin:.8mm 0}
.logo{height:40mm;width:48mm;object-fit:contain}
.right{position:absolute;right:0;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;align-items:center;gap:.6mm;width:21mm}
.qr svg{width:19mm;height:19mm;display:block}
.qrtxt{font-size:1.6mm;font-weight:700;text-align:center;line-height:1.2}
table{width:100%;border-collapse:collapse;font-size:2.9mm;text-align:center}
th,td{border:.35mm solid #000;padding:.7mm .4mm;line-height:1.15}
th{font-weight:700;font-size:2.55mm}
td.more{font-size:2.3mm;font-style:italic}
.addr{font-size:2.5mm;text-align:center;text-decoration:underline;color:#444;margin-top:1.2mm;line-height:1.3}
.refline{font-size:2.4mm;text-align:center;font-weight:700;margin-top:.6mm}
.c1 .logo{height:29mm;width:38mm}.c1 .qr svg{width:17mm;height:17mm}.c1 .right{width:19mm}.c1 table{font-size:2.6mm}
.c2 .logo{height:20mm;width:28mm}.c2 .qr svg{width:15mm;height:15mm}.c2 .right{width:17mm}.c2 .qrtxt{display:none}.c2 table{font-size:2.3mm}.c2 th{font-size:2.2mm}.c2 td{padding:.4mm .3mm}
`;

const FORMAT_CSS: Record<LabelFormat, string> = {
  a4: `@page{size:A4;margin:0}
.page{width:210mm;height:297mm;padding:6mm 5mm;display:grid;grid-template-columns:100mm 100mm;grid-template-rows:100mm 100mm;justify-content:center;align-content:start;page-break-after:always}
.page:last-child{page-break-after:auto}
.page .label{border:.2mm dashed #999}`,
  adhesive: `@page{size:100mm 100mm;margin:0}
.sheet{width:100mm;height:100mm;page-break-after:always}
.sheet:last-child{page-break-after:auto}`,
  thermal: `@page{size:100mm 150mm;margin:0}
.sheet{width:100mm;height:150mm;page-break-after:always}
.sheet:last-child{page-break-after:auto}`,
};

/**
 * Écrit les étiquettes dans la fenêtre `w` (ouverte par le clic, pour ne pas être bloquée par le navigateur)
 * puis lance l'impression une fois les images chargées. `labels[i].count` = nombre d'exemplaires.
 */
export async function printLabels(w: Window, labels: LabelData[], format: LabelFormat, siteUrl: string): Promise<void> {
  const origin = window.location.origin;
  const cells: string[] = [];
  for (const d of labels) {
    const qr = await qrSvg(receiptUrl(d.token, siteUrl));
    for (let i = 1; i <= d.count; i++) cells.push(labelHtml(d, i, qr, origin));
  }

  let body: string;
  if (format === 'a4') {
    const pages: string[] = [];
    for (let i = 0; i < cells.length; i += 4) pages.push(`<div class="page">${cells.slice(i, i + 4).join('')}</div>`);
    body = pages.join('');
  } else {
    body = cells.map((c) => `<div class="sheet">${c}</div>`).join('');
  }

  w.document.open();
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Étiquettes PSI</title><style>${CSS}${FORMAT_CSS[format]}</style></head><body>${body}</body></html>`);
  w.document.close();

  // Attendre logo + schéma (sinon l'impression part avec des images vides), 4 s maximum.
  const imgs = Array.from(w.document.images);
  await Promise.race([
    Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise<void>((r) => { im.onload = im.onerror = () => r(); })))),
    new Promise<void>((r) => setTimeout(r, 4000)),
  ]);
  w.focus();
  w.print();
}
