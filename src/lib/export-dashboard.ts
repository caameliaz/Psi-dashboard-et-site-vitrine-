import { styleBandRow, styleHeaderRow, styleDataRows, styleSectionTitle } from '@/lib/xlsx-style';

export interface DashboardExportData {
  stats: { commandes: number; devis: number; clients: number; livrees: number };
  todayStats: { commandes: number; attente: number; contactes: number };
  sourceStats: { site: number; manuel: number };
  evolution: number;
  devisEnAttente: { count: number; montant: number };
  topProduits: { ref: string; qty: number; label: string }[];
  topWilayas: { wilaya: string; count: number }[];
  serie6Mois: { mois: string; commandes: number; devis: number }[];
  employesActifs: { name: string; count: number }[];
}

const NUM_COLS = 4;
const pad = (r: (string | number)[]) => { while (r.length < NUM_COLS) r.push(''); return r; };

export async function exportDashboardExcel(d: DashboardExportData) {
  const { utils, writeFile } = await import('xlsx-js-style');
  const date = new Date().toLocaleDateString('fr-FR');
  const rows: (string | number)[][] = [];
  const push = (r: (string | number)[]) => rows.push(r);
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];
  const titleRows: number[] = [];
  const headerRows: { idx: number; cols: number }[] = [];
  const dataRanges: { start: number; end: number; cols: number }[] = [];

  const lastCol = NUM_COLS - 1;
  const bandMerge = (r: number) => merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } });

  // En-tête
  bandMerge(rows.length); push(pad(['PSI — Paper Solutions Industry']));
  bandMerge(rows.length); push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | Contact@psi.dz']));
  bandMerge(rows.length); push(pad([`Tableau de bord — Exporté le ${date}`]));
  push(pad([]));

  // Section générique clé/valeur
  const section = (titre: string, headers: string[], lines: (string | number)[][]) => {
    merges.push({ s: { r: rows.length, c: 0 }, e: { r: rows.length, c: lastCol } });
    titleRows.push(rows.length);
    push(pad([titre]));
    headerRows.push({ idx: rows.length, cols: headers.length });
    push(pad(headers));
    const start = rows.length;
    lines.forEach((l) => push(pad(l)));
    dataRanges.push({ start, end: rows.length - 1, cols: headers.length });
    push(pad([]));
  };

  // Indicateurs clés
  section('INDICATEURS CLÉS', ['Indicateur', 'Valeur'], [
    ['Commandes (total)', d.stats.commandes],
    ['Devis (total)', d.stats.devis],
    ['Clients', d.stats.clients],
    ['Commandes livrées', d.stats.livrees],
    ['Évolution commandes (%)', d.evolution],
    ['Devis en attente (nb)', d.devisEnAttente.count],
    ['Devis en attente (montant DA)', d.devisEnAttente.montant],
  ]);

  section("AUJOURD'HUI", ['Indicateur', 'Valeur'], [
    ['Commandes du jour', d.todayStats.commandes],
    ['En attente', d.todayStats.attente],
    ['Contactés', d.todayStats.contactes],
  ]);

  section('SOURCE DES DEMANDES', ['Source', 'Nombre'], [
    ['Site web', d.sourceStats.site],
    ['Manuel', d.sourceStats.manuel],
  ]);

  if (d.topProduits.length)
    section('TOP PRODUITS', ['Référence', 'Libellé', 'Quantité'],
      d.topProduits.map((p) => [p.ref, p.label, p.qty]));

  if (d.topWilayas.length)
    section('TOP WILAYAS', ['Wilaya', 'Commandes'],
      d.topWilayas.map((w) => [w.wilaya, w.count]));

  if (d.serie6Mois.length)
    section('ÉVOLUTION 6 MOIS', ['Mois', 'Commandes', 'Devis'],
      d.serie6Mois.map((m) => [m.mois, m.commandes, m.devis]));

  if (d.employesActifs.length)
    section('EMPLOYÉS ACTIFS', ['Employé', 'Demandes traitées'],
      d.employesActifs.map((e) => [e.name, e.count]));

  const ws = utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 26 }, { wch: 16 }, { wch: 16 }];
  ws['!merges'] = merges;

  styleBandRow(ws, 0, NUM_COLS, 13);
  styleBandRow(ws, 1, NUM_COLS);
  styleBandRow(ws, 2, NUM_COLS);
  titleRows.forEach((r) => styleSectionTitle(ws, r, 0));
  headerRows.forEach((h) => styleHeaderRow(ws, h.idx, h.cols));
  dataRanges.forEach((r) => { if (r.end >= r.start) styleDataRows(ws, r.start, r.end, r.cols); });

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Tableau de bord');
  writeFile(wb, `Dashboard_PSI_${date.replace(/\//g, '-')}.xlsx`);
}
