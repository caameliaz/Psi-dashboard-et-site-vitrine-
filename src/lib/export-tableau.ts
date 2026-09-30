import { canonPaiement } from '@/lib/payment-method';
import type { RequestDetail } from '@/components/ui/RequestPanel';
import { styleBandRow, styleHeaderRow, styleDataRows, styleSectionTitle, styleFiltersLine, styleTotalHighlight } from '@/lib/xlsx-style';

// Export "tableau" : UNE LIGNE PAR PRODUIT.
// Les infos de la commande/devis (réf, client, wilaya, date…) sont RÉPÉTÉES sur
// chaque ligne produit → aucune cellule vide, l'Excel reste filtrable/triable.
// Exception : « Total commande » n'est écrit que sur la 1re ligne de chaque commande,
// pour que la somme de la colonne dans Excel donne le vrai total.
const NUM_COLS = 19;
const pad = (r: (string | number)[]) => { while (r.length < NUM_COLS) r.push(''); return r; };

// Annulé / Retourné : pas une vente → ligne gardée (statut visible) mais montants
// laissés vides et exclus du total, pour qu'une somme de colonne dans Excel reste juste
// (ex. devis en double annulé).
const HORS_TOTAL = new Set(['Annulé', 'Retourné']);

const montantToNum = (s: string) =>
  Number(String(s).replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;

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
  push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | Contact@psi.dz']));
  push(pad([`${titre} — Exporté le ${date}`]));
  const filtersRowIdx = allRows.length;
  push(pad([filtresLabel ? `Filtres appliqués : ${filtresLabel}` : '']));
  push(pad([]));

  // ── Tableau détail : 1 ligne par produit ──────────────────────────────────
  const headerRowIdx = allRows.length;
  push([
    'Référence', 'Type', 'Date', 'Client', 'Entreprise', 'Téléphone', 'Wilaya', 'Commune',
    'Statut', 'Type de paiement', 'Facture', 'TVA', 'Catégorie', 'Produit', 'Métrage (m)', 'Qté', 'Prix unitaire (DA)', 'Total ligne (DA)', 'Total commande (DA)',
  ]);
  const dataStart = allRows.length;

  let totalGlobal = 0;
  let nbCompte = 0;
  items.forEach((r) => {
    const dateStr = r.date; // date seule (jj/mm/aaaa), sans l'heure
    const montantCommande = montantToNum(r.montant);
    const compte = !HORS_TOTAL.has(r.statut);
    if (compte) { totalGlobal += montantCommande; nbCompte += 1; }
    const lignes = (r.items && r.items.length > 0)
      ? r.items
      : [{ designation: r.produits, categorie: '—', quantite: 0, prixUnitaire: 0, metrage: null }];
    lignes.forEach((l, index) => {
      const qty = l.quantite || 0;
      const pu = l.prixUnitaire || 0;
      const totalLigne = qty * pu;
      // Toutes les infos de la commande répétées → pas de cellule vide
      push([
        r.ref, r.type, dateStr, r.client, r.entreprise || '—', r.telephone || '—',
        r.wilaya || '—', r.commune || '—', r.statut,
        canonPaiement(r.paymentMethod) ?? '—',
        r.invoiceNumber?.trim() ? 'Avec' : 'Sans',
        r.vatEnabled ? 'Oui' : 'Non',
        l.categorie || '—', l.designation || '—',
        l.metrage != null ? l.metrage : '—',
        qty,
        pu,
        compte ? totalLigne : '',
        compte && index === 0 ? montantCommande : '',
      ]);
    });
  });
  const dataEnd = allRows.length - 1;
  push(pad([]));

  // ── Récapitulatif par statut ──────────────────────────────────────────────
  const parStatut = items.reduce<Record<string, { count: number; montant: number }>>((acc, r) => {
    const n = montantToNum(r.montant);
    if (!acc[r.statut]) acc[r.statut] = { count: 0, montant: 0 };
    acc[r.statut].count += 1;
    acc[r.statut].montant += n;
    return acc;
  }, {});

  push(pad(['RÉCAPITULATIF']));
  const summaryHeaderIdx = allRows.length;
  push(pad(['Indicateur', 'Valeur', 'Prix (DA)']));
  const summaryDataStart = allRows.length;
  Object.entries(parStatut).forEach(([s, v]) => push(pad([s, v.count, v.montant])));
  const summaryDataEnd = allRows.length - 1;
  const totalRowIdx = allRows.length;
  const horsTotal = items.length - nbCompte;
  push(pad([horsTotal > 0 ? 'Total hors annulés' : 'Total', nbCompte, totalGlobal]));

  const ws = utils.aoa_to_sheet(allRows);

  ws['!cols'] = [
    { wch: 20 }, // Ref (assez large pour « Total hors annulés » du récap)
    { wch: 11 }, // Type
    { wch: 12 }, // Date
    { wch: 24 }, // Client
    { wch: 26 }, // Entreprise
    { wch: 16 }, // Téléphone
    { wch: 16 }, // Wilaya
    { wch: 16 }, // Commune
    { wch: 13 }, // Statut
    { wch: 16 }, // Type de paiement
    { wch: 10 }, // Facture
    { wch: 7 },  // TVA
    { wch: 18 }, // Catégorie
    { wch: 30 }, // Produit
    { wch: 12 }, // Métrage
    { wch: 8 },  // Qté
    { wch: 16 }, // Prix unitaire
    { wch: 16 }, // Total ligne
    { wch: 18 }, // Total commande
  ];

  const lastCol = NUM_COLS - 1;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: filtersRowIdx, c: 0 }, e: { r: filtersRowIdx, c: lastCol } },
    { s: { r: summaryHeaderIdx - 1, c: 0 }, e: { r: summaryHeaderIdx - 1, c: lastCol } },
  ];

  styleBandRow(ws, 0, NUM_COLS, 13);
  styleBandRow(ws, 1, NUM_COLS);
  styleBandRow(ws, 2, NUM_COLS);
  if (filtresLabel) styleFiltersLine(ws, filtersRowIdx, 0);
  styleHeaderRow(ws, headerRowIdx, NUM_COLS);
  if (dataEnd >= dataStart) styleDataRows(ws, dataStart, dataEnd, NUM_COLS);

  styleSectionTitle(ws, summaryHeaderIdx - 1, 0);
  styleHeaderRow(ws, summaryHeaderIdx, 3);
  if (summaryDataEnd >= summaryDataStart) styleDataRows(ws, summaryDataStart, summaryDataEnd, 3);
  styleTotalHighlight(ws, totalRowIdx, 0, 1, 2);

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, titre.slice(0, 31));
  writeFile(wb, `${filename}_${date.replace(/\//g, '-')}.xlsx`);
}
