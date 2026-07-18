import { styleBandRow, styleHeaderRow, styleDataRows, styleFiltersLine, styleSubTotalRow, styleTotalHighlight } from '@/lib/xlsx-style';

export async function exportVentesExcel(filtresLabel?: string) {
  const res = await fetch('/api/orders/export');
  if (!res.ok) throw new Error('Erreur chargement données');
  const orders: any[] = await res.json();

  const { utils, writeFile } = await import('xlsx-js-style');

  const dateExport = new Date().toLocaleDateString('fr-FR');
  const NUM_COLS = 12;
  const pad = (r: (string | number)[]) => { while (r.length < NUM_COLS) r.push(''); return r; };

  // ── En-tête document ──────────────────────────────────────────────────────
  const SOURCE_LABEL: Record<string, string> = {
    SITE: 'Site web', ADMIN: 'Manuel', WHATSAPP: 'WhatsApp', TELEPHONE: 'Téléphone', AUTRE: 'Autre',
  };

  const allRows: (string | number)[][] = [];
  const push = (r: (string | number)[]) => allRows.push(r);

  push(pad(['PSI — Paper Solutions Industry']));
  push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | contact@psi-algerie.com']));
  push(pad([`Rapport de ventes — Commandes livrées — Exporté le ${dateExport}`]));
  const filtersRowIdx = allRows.length;
  push(pad([filtresLabel ? `Filtres appliqués : ${filtresLabel}` : '']));
  push(pad([]));

  const headerRowIdx = allRows.length;
  push([
    'N° Facture', 'Source', 'Date commande', 'Date livraison', 'Client', 'Entreprise',
    'Wilaya', 'Agent', 'Réf produit', 'Qté', 'Prix unitaire (DA)', 'Total ligne (DA)',
  ]);

  // ── Lignes — une ligne par produit ────────────────────────────────────────
  const dataStart = allRows.length;
  let grandTotal = 0;

  for (const order of orders) {
    const dateCmd = new Date(order.createdAt).toLocaleDateString('fr-FR');
    const dateLiv = new Date(order.updatedAt).toLocaleDateString('fr-FR');
    const client = order.client?.name ?? order.clientName ?? '—';
    const entreprise = order.client?.company ?? order.clientCompany ?? '—';
    const wilaya = order.client?.wilaya ?? order.clientWilaya ?? '—';
    const agent = order.createdBy?.name ?? 'Site web';
    const ref = order.ref ?? order.id.slice(0, 8).toUpperCase();
    const source = SOURCE_LABEL[order.source] ?? order.source ?? '—';

    if (!order.items || order.items.length === 0) {
      push([ref, source, dateCmd, dateLiv, client, entreprise, wilaya, agent, '—', 0, 0, 0]);
    } else {
      order.items.forEach((item: any, idx: number) => {
        const prodRef = item.product?.reference ?? '—';
        const qty = item.quantity ?? 0;
        const pu = item.unitPrice ?? 0;
        const totalLigne = qty * pu;
        grandTotal += totalLigne;

        push([
          idx === 0 ? ref    : '',
          idx === 0 ? source : '',
          idx === 0 ? dateCmd : '',
          idx === 0 ? dateLiv : '',
          idx === 0 ? client : '',
          idx === 0 ? entreprise : '',
          idx === 0 ? wilaya : '',
          idx === 0 ? agent : '',
          prodRef,
          qty,
          pu,
          totalLigne,
        ]);
      });
    }
  }
  const dataEnd = allRows.length - 1;
  push(pad([]));

  // ── Totaux, bien visibles en bas à gauche ───────────────────────────────────
  const totalVentesIdx = allRows.length;
  push(pad(['TOTAL VENTES', grandTotal]));
  const totalCmdIdx = allRows.length;
  push(pad(['Nombre commandes', orders.length]));

  const ws = utils.aoa_to_sheet(allRows);

  // ── Largeurs colonnes (élargies pour que les champs longs soient visibles) ──
  ws['!cols'] = [
    { wch: 18 }, // N° Facture
    { wch: 14 }, // Source
    { wch: 14 }, // Date cmd
    { wch: 14 }, // Date liv
    { wch: 26 }, // Client
    { wch: 30 }, // Entreprise
    { wch: 18 }, // Wilaya
    { wch: 18 }, // Agent
    { wch: 16 }, // Réf produit
    { wch: 8  }, // Qté
    { wch: 18 }, // Prix unit
    { wch: 18 }, // Total ligne
  ];

  // ── Fusion en-têtes PSI ────────────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
    { s: { r: filtersRowIdx, c: 0 }, e: { r: filtersRowIdx, c: 11 } },
  ];

  // ── Styles : bandeau, en-tête coloré, grille de bordures sur les données ────
  styleBandRow(ws, 0, NUM_COLS, 13);
  styleBandRow(ws, 1, NUM_COLS);
  styleBandRow(ws, 2, NUM_COLS);
  if (filtresLabel) styleFiltersLine(ws, filtersRowIdx, 0);
  styleHeaderRow(ws, headerRowIdx, NUM_COLS);
  if (dataEnd >= dataStart) styleDataRows(ws, dataStart, dataEnd, NUM_COLS);

  styleTotalHighlight(ws, totalVentesIdx, 0, 1);
  styleSubTotalRow(ws, totalCmdIdx, 0, 1);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Ventes');
  writeFile(wb, `PSI_Ventes_${dateExport.replace(/\//g, '-')}.xlsx`);
}
