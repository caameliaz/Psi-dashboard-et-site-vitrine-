import type { RequestDetail } from '@/components/ui/RequestPanel';
import { styleBandRow, styleHeaderRow, styleDataRows, styleSectionTitle, styleFiltersLine, styleTotalHighlight } from '@/lib/xlsx-style';

const NUM_COLS = 9;
const pad = (r: (string | number)[]) => { while (r.length < NUM_COLS) r.push(''); return r; };

export async function exportTableauExcel(
  items: RequestDetail[],
  filename: string,
  titre: string,
  filtresLabel?: string
) {
  const { utils, writeFile } = await import('xlsx-js-style');

  const date = new Date().toLocaleDateString('fr-FR');
  const allRows: (string | number)[][] = [];
  const push = (r: (string | number)[]) => allRows.push(r);

  // ── En-tête document ──────────────────────────────────────────────────────
  push(pad(['PSI — Paper Solutions Industry']));
  push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | contact@psi-algerie.com']));
  push(pad([`${titre} — Exporté le ${date}`]));
  const filtersRowIdx = allRows.length;
  push(pad([filtresLabel ? `Filtres appliqués : ${filtresLabel}` : '']));
  push(pad([]));

  // ── Tableau détail ───────────────────────────────────────────────────────
  const headerRowIdx = allRows.length;
  push(['Référence', 'Type', 'Date', 'Client', 'Entreprise', 'Wilaya', 'Statut', 'Produits', 'Montant HT']);
  const dataStart = allRows.length;
  items.forEach((r) => {
    const montantNum = Number(r.montant.replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;
    push([r.ref, r.type, r.date + (r.heure ? ` ${r.heure}` : ''), r.client, r.entreprise, r.wilaya || '—', r.statut, r.produits, montantNum]);
  });
  const dataEnd = allRows.length - 1;
  push(pad([]));

  // ── Totaux par statut : compte + montant ──────────────────────────────────
  const totalGlobal = items.reduce((acc, r) => {
    const n = Number(r.montant.replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;
    return acc + n;
  }, 0);
  const parStatut = items.reduce<Record<string, { count: number; montant: number }>>((acc, r) => {
    const n = Number(r.montant.replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;
    if (!acc[r.statut]) acc[r.statut] = { count: 0, montant: 0 };
    acc[r.statut].count += 1;
    acc[r.statut].montant += n;
    return acc;
  }, {});

  // ── Tableau récapitulatif : Indicateur | Valeur (nombre) | Prix (DA) ───────
  push(pad(['RÉCAPITULATIF']));
  const summaryHeaderIdx = allRows.length;
  push(pad(['Indicateur', 'Valeur', 'Prix (DA)']));
  const summaryDataStart = allRows.length;
  Object.entries(parStatut).forEach(([s, v]) => push(pad([s, v.count, v.montant])));
  const summaryDataEnd = allRows.length - 1;
  const totalRowIdx = allRows.length;
  push(pad(['Total', items.length, totalGlobal]));

  const ws = utils.aoa_to_sheet(allRows);

  // ── Largeurs colonnes (élargies pour que les champs longs soient visibles) ─
  ws['!cols'] = [
    { wch: 18 }, // Ref
    { wch: 12 }, // Type
    { wch: 18 }, // Date
    { wch: 28 }, // Client
    { wch: 30 }, // Entreprise
    { wch: 18 }, // Wilaya
    { wch: 14 }, // Statut
    { wch: 45 }, // Produits
    { wch: 16 }, // Montant
  ];

  // ── Fusion en-têtes PSI + titres de section (sinon une cellule vide juste
  // après bloque le débordement du texte et le coupe) ─────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
    { s: { r: filtersRowIdx, c: 0 }, e: { r: filtersRowIdx, c: 8 } },
    { s: { r: summaryHeaderIdx - 1, c: 0 }, e: { r: summaryHeaderIdx - 1, c: 8 } },
  ];

  // ── Styles : bandeau, en-têtes colorés, grilles de bordures ────────────────
  styleBandRow(ws, 0, NUM_COLS, 13);
  styleBandRow(ws, 1, NUM_COLS);
  styleBandRow(ws, 2, NUM_COLS);
  if (filtresLabel) styleFiltersLine(ws, filtersRowIdx, 0);
  styleHeaderRow(ws, headerRowIdx, NUM_COLS);
  if (items.length > 0) styleDataRows(ws, dataStart, dataEnd, NUM_COLS);

  styleSectionTitle(ws, summaryHeaderIdx - 1, 0);
  styleHeaderRow(ws, summaryHeaderIdx, 3);
  if (summaryDataEnd >= summaryDataStart) styleDataRows(ws, summaryDataStart, summaryDataEnd, 3);
  styleTotalHighlight(ws, totalRowIdx, 0, 1, 2);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, titre.slice(0, 31));
  writeFile(wb, `${filename}_${date.replace(/\//g, '-')}.xlsx`);
}
