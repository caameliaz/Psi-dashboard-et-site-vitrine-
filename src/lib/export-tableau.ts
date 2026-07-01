import type { RequestDetail } from '@/components/ui/RequestPanel';

export async function exportTableauExcel(
  items: RequestDetail[],
  filename: string,
  titre: string
) {
  const { utils, writeFile } = await import('xlsx');

  const date = new Date().toLocaleDateString('fr-FR');

  // ── En-tête document ──────────────────────────────────────────────────────
  const header: (string | number)[][] = [
    ['PSI — Paper Solutions Industry', '', '', '', '', '', ''],
    ['Centre El Qods, Niveau M1 — Chéraga, Alger | contact@psi-algerie.com', '', '', '', '', '', ''],
    [`${titre} — Exporté le ${date}`, '', '', '', '', '', ''],
    [],
    ['Référence', 'Type', 'Date', 'Client', 'Entreprise', 'Wilaya', 'Statut', 'Produits', 'Montant HT'],
  ];

  // ── Lignes données ─────────────────────────────────────────────────────────
  const rows = items.map((r) => {
    const montantNum = Number(r.montant.replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;
    return [
      r.ref,
      r.type,
      r.date + (r.heure ? ` ${r.heure}` : ''),
      r.client,
      r.entreprise,
      r.wilaya || '—',
      r.statut,
      r.produits,
      montantNum,
    ];
  });

  // ── Totaux par statut ──────────────────────────────────────────────────────
  const totalGlobal = rows.reduce((acc, r) => acc + (r[8] as number), 0);
  const parStatut = rows.reduce<Record<string, number>>((acc, r) => {
    const s = r[6] as string;
    acc[s] = (acc[s] ?? 0) + (r[8] as number);
    return acc;
  }, {});

  const summary: (string | number)[][] = [
    [],
    ['RÉCAPITULATIF', '', '', '', '', '', '', '', ''],
    ['Nombre total', items.length, '', '', '', '', '', '', ''],
    ['Total montants', totalGlobal, '', '', '', '', '', '', ''],
    [],
    ...Object.entries(parStatut).map(([s, v]) => [`  ${s}`, v, '', '', '', '', '', '', '']),
  ];

  const allRows = [...header, ...rows, ...summary];
  const ws = utils.aoa_to_sheet(allRows);

  // ── Largeurs colonnes ──────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 16 }, // Ref
    { wch: 10 }, // Type
    { wch: 18 }, // Date
    { wch: 22 }, // Client
    { wch: 22 }, // Entreprise
    { wch: 16 }, // Wilaya
    { wch: 12 }, // Statut
    { wch: 40 }, // Produits
    { wch: 14 }, // Montant
  ];

  // ── Fusion en-têtes PSI ────────────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, titre.slice(0, 31));
  writeFile(wb, `${filename}_${date.replace(/\//g, '-')}.xlsx`);
}
