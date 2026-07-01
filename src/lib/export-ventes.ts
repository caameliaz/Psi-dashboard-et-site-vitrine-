export async function exportVentesExcel() {
  const res = await fetch('/api/orders/export');
  if (!res.ok) throw new Error('Erreur chargement données');
  const orders: any[] = await res.json();

  const { utils, writeFile } = await import('xlsx');

  const dateExport = new Date().toLocaleDateString('fr-FR');

  // ── En-tête document ──────────────────────────────────────────────────────
  const SOURCE_LABEL: Record<string, string> = {
    SITE: 'Site web', ADMIN: 'Manuel', WHATSAPP: 'WhatsApp', TELEPHONE: 'Téléphone', AUTRE: 'Autre',
  };

  const docHeader = [
    ['PSI — Paper Solutions Industry', '', '', '', '', '', '', '', '', '', '', ''],
    ['Centre El Qods, Niveau M1 — Chéraga, Alger | contact@psi-algerie.com', '', '', '', '', '', '', '', '', '', '', ''],
    [`Rapport de ventes — Commandes livrées — Exporté le ${dateExport}`, '', '', '', '', '', '', '', '', '', '', ''],
    [],
    [
      'N° Facture',
      'Source',
      'Date commande',
      'Date livraison',
      'Client',
      'Entreprise',
      'Wilaya',
      'Agent',
      'Réf produit',
      'Qté',
      'Prix unitaire (DA)',
      'Total ligne (DA)',
    ],
  ];

  // ── Lignes — une ligne par produit ────────────────────────────────────────
  const rows: (string | number)[][] = [];
  let grandTotal = 0;

  for (const order of orders) {
    const dateCmd = new Date(order.createdAt).toLocaleDateString('fr-FR');
    const dateLiv = new Date(order.updatedAt).toLocaleDateString('fr-FR');
    const client = order.client?.name ?? '—';
    const entreprise = order.client?.company ?? '—';
    const wilaya = order.client?.wilaya ?? '—';
    const agent = order.createdBy?.name ?? 'Site web';
    const ref = order.ref ?? order.id.slice(0, 8).toUpperCase();
    const source = SOURCE_LABEL[order.source] ?? order.source ?? '—';

    if (!order.items || order.items.length === 0) {
      rows.push([ref, source, dateCmd, dateLiv, client, entreprise, wilaya, agent, '—', 0, 0, 0]);
    } else {
      order.items.forEach((item: any, idx: number) => {
        const prodRef = item.product?.reference ?? '—';
        const qty = item.quantity ?? 0;
        const pu = item.unitPrice ?? 0;
        const totalLigne = qty * pu;
        grandTotal += totalLigne;

        rows.push([
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

  // ── Totaux ────────────────────────────────────────────────────────────────
  const summary = [
    [],
    ['', '', '', '', '', '', '', '', '', 'TOTAL VENTES', grandTotal],
    ['', '', '', '', '', '', '', '', '', 'Nombre commandes', orders.length],
  ];

  const allRows = [...docHeader, ...rows, ...summary];
  const ws = utils.aoa_to_sheet(allRows);

  // ── Largeurs colonnes ─────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 16 }, // N° Facture
    { wch: 12 }, // Source
    { wch: 14 }, // Date cmd
    { wch: 14 }, // Date liv
    { wch: 20 }, // Client
    { wch: 22 }, // Entreprise
    { wch: 16 }, // Wilaya
    { wch: 16 }, // Agent
    { wch: 14 }, // Réf produit
    { wch: 6  }, // Qté
    { wch: 18 }, // Prix unit
    { wch: 16 }, // Total ligne
  ];

  // ── Fusion en-têtes PSI ───────────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Ventes');
  writeFile(wb, `PSI_Ventes_${dateExport.replace(/\//g, '-')}.xlsx`);
}
