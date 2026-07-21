import { styleBandRow, styleHeaderRow, styleDataRows, styleSectionTitle, styleTotalHighlight } from '@/lib/xlsx-style';

// Données de fiche client à exporter (sous-ensemble de ClientRecord)
export interface ClientExportData {
  entreprise: string;
  contact: string;
  telephone: string;
  wilaya: string;
  commune?: string;
  sectorName?: string;
  adresse: string;
  email: string;
  commandes: number;
  devis: number;
  active?: boolean;
  deactivatedReason?: string | null;
  historique: Array<{
    ref: string;
    type: 'Commande' | 'Devis';
    date: string;
    statut: string;
    montant: string;
    produits: string;
  }>;
}

const montantToNum = (s: string) =>
  Number(String(s).replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;

const clientLabel = (c: ClientExportData) => c.entreprise || c.contact || 'client';
const safeName = (c: ClientExportData) => clientLabel(c).replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40);

// ── Export Excel : infos client + historique complet ────────────────────────
export async function exportClientExcel(c: ClientExportData) {
  const { utils, writeFile } = await import('xlsx-js-style');
  const date = new Date().toLocaleDateString('fr-FR');
  const NUM_COLS = 6;
  const rows: (string | number)[][] = [];
  const pad = (r: (string | number)[]) => { while (r.length < NUM_COLS) r.push(''); return r; };
  const push = (r: (string | number)[]) => rows.push(r);

  // En-tête document
  push(pad(['PSI — Paper Solutions Industry']));
  push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | Contact@psi.dz']));
  push(pad([`Fiche client — ${clientLabel(c)} — Exporté le ${date}`]));
  push(pad([]));

  // Bloc infos client (clé | valeur)
  push(pad(['INFORMATIONS CLIENT']));
  const infoHeaderIdx = rows.length;
  push(pad(['Champ', 'Valeur']));
  const infoStart = rows.length;
  const infoLines: [string, string][] = [
    ['Entreprise', c.entreprise || '—'],
    ['Contact', c.contact || '—'],
    ['Téléphone', c.telephone || '—'],
    ['Email', c.email || '—'],
    ['Wilaya', c.wilaya || '—'],
    ['Commune', c.commune || '—'],
    ['Adresse', c.adresse || '—'],
    ['Secteur', c.sectorName || '—'],
    ['Nombre de commandes', String(c.commandes)],
    ['Nombre de devis', String(c.devis)],
    ['Statut', c.active === false ? `Désactivé${c.deactivatedReason ? ` — ${c.deactivatedReason}` : ''}` : 'Actif'],
  ];
  infoLines.forEach(([k, v]) => push(pad([k, v])));
  const infoEnd = rows.length - 1;
  push(pad([]));

  // Historique (commandes + devis)
  push(pad(['HISTORIQUE']));
  const histHeaderIdx = rows.length;
  push(['Référence', 'Type', 'Date', 'Statut', 'Produits', 'Montant']);
  const histStart = rows.length;
  c.historique.forEach((h) => push([h.ref, h.type, h.date, h.statut, h.produits, montantToNum(h.montant)]));
  const histEnd = rows.length - 1;
  push(pad([]));

  // Total
  const total = c.historique.reduce((acc, h) => acc + montantToNum(h.montant), 0);
  const totalRowIdx = rows.length;
  push(pad(['Total', String(c.historique.length), '', '', '', total]));

  const ws = utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 46 }, { wch: 16 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: NUM_COLS - 1 } },
    { s: { r: infoHeaderIdx - 1, c: 0 }, e: { r: infoHeaderIdx - 1, c: NUM_COLS - 1 } },
    { s: { r: histHeaderIdx - 1, c: 0 }, e: { r: histHeaderIdx - 1, c: NUM_COLS - 1 } },
  ];

  styleBandRow(ws, 0, NUM_COLS, 13);
  styleBandRow(ws, 1, NUM_COLS);
  styleBandRow(ws, 2, NUM_COLS);
  styleSectionTitle(ws, infoHeaderIdx - 1, 0);
  styleHeaderRow(ws, infoHeaderIdx, 2);
  styleDataRows(ws, infoStart, infoEnd, 2);
  styleSectionTitle(ws, histHeaderIdx - 1, 0);
  styleHeaderRow(ws, histHeaderIdx, NUM_COLS);
  if (histEnd >= histStart) styleDataRows(ws, histStart, histEnd, NUM_COLS);
  styleTotalHighlight(ws, totalRowIdx, 0, 1, NUM_COLS - 1);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Fiche client');
  writeFile(wb, `Fiche_${safeName(c)}_${date.replace(/\//g, '-')}.xlsx`);
}

// ── Export PDF (fenêtre d'impression, même charte que les commandes) ─────────
export async function printClientDoc(c: ClientExportData) {
  let logoHtml = '<div style="font-size:20px;font-weight:800;letter-spacing:-0.5px">PSI</div><div style="font-size:10px;color:#666">Paper Solutions Industry</div>';
  try {
    const resp = await fetch('/Logo PSI-new.jpeg');
    const blob = await resp.blob();
    const b64 = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(blob);
    });
    logoHtml = `<img src="${b64}" alt="PSI" style="height:52px;filter:grayscale(100%) contrast(110%);display:block;margin-bottom:4px"/>`;
  } catch { /* fallback texte */ }

  const total = c.historique.reduce((acc, h) => acc + montantToNum(h.montant), 0);
  const histRows = c.historique.map((h) => `<tr>
    <td style="font-weight:600">${h.ref}</td>
    <td>${h.type}</td>
    <td>${h.date}</td>
    <td>${h.statut}</td>
    <td>${h.produits}</td>
    <td style="text-align:right">${h.montant || '—'}</td>
  </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#999">Aucun historique</td></tr>';

  const cell = (label: string, value: string, full = false) =>
    `<div class="client-cell"${full ? ' style="grid-column:1/-1"' : ''}><div class="cell-label">${label}</div><div class="cell-value">${value || '—'}</div></div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px 48px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
  .brand-addr{font-size:10px;color:#999;margin-top:6px;line-height:1.5}
  .doc-meta{text-align:right}
  .doc-type{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px}
  .doc-ref{font-size:22px;font-weight:900;letter-spacing:-1px}
  .doc-date{font-size:11px;color:#666;margin-top:4px}
  hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
  .section-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#999;margin-bottom:10px}
  .client-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:28px}
  .client-cell{padding:10px 14px;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}
  .client-cell:nth-child(even){border-right:none}
  .cell-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:3px}
  .cell-value{font-size:12px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:#111;color:#fff}
  thead th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px}
  tbody tr:nth-child(even){background:#f9fafb}
  tbody td{padding:9px 12px;font-size:11px;border-bottom:1px solid #f0f0f0}
  .total-row{display:flex;justify-content:flex-end;margin-top:8px}
  .total-box{border:2px solid #111;border-radius:6px;padding:12px 20px;min-width:240px;display:flex;justify-content:space-between;align-items:center}
  .total-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
  .total-amount{font-size:18px;font-weight:900}
  .banner{background:#FFF7ED;border:1px solid #FED7AA;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:11px;color:#9A3412}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:10px;color:#aaa;display:flex;justify-content:space-between}
  @media print{body{padding:24px 32px}@page{margin:0;size:A4}}
</style></head><body>
<div class="header">
  <div>${logoHtml}<div class="brand-addr">Centre El Qods, Niveau M1 — Chéraga, Alger<br/>Contact@psi.dz</div></div>
  <div class="doc-meta">
    <div class="doc-type">Fiche client</div>
    <div class="doc-ref">${clientLabel(c)}</div>
    <div class="doc-date">Éditée le ${new Date().toLocaleDateString('fr-FR')}</div>
  </div>
</div>
<hr/>
${c.active === false ? `<div class="banner">Client désactivé${c.deactivatedReason ? ` — motif : ${c.deactivatedReason}` : ''}</div>` : ''}
<div class="section-title">Informations</div>
<div class="client-grid">
  ${cell('Entreprise', c.entreprise)}
  ${cell('Contact', c.contact)}
  ${cell('Téléphone', c.telephone)}
  ${cell('Email', c.email)}
  ${cell('Wilaya', c.wilaya)}
  ${cell('Commune', c.commune || '')}
  ${cell('Secteur', c.sectorName || '')}
  ${cell('Commandes / Devis', `${c.commandes} / ${c.devis}`)}
  ${cell('Adresse', c.adresse, true)}
</div>
<div class="section-title">Historique complet</div>
<table>
  <thead><tr><th>Référence</th><th>Type</th><th>Date</th><th>Statut</th><th>Produits</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>${histRows}</tbody>
</table>
<div class="total-row">
  <div class="total-box">
    <span class="total-label">Total historique</span>
    <span class="total-amount">${total.toLocaleString('fr-FR')} DA</span>
  </div>
</div>
<div class="footer">
  <span>${clientLabel(c)} · PSI Paper Solutions Industry</span>
  <span>psi-algerie.com</span>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}
