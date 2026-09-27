import type { RequestDetail } from '@/components/ui/RequestPanel';
import { styleBandRow, styleHeaderRow, styleDataRows, styleFiltersLine, styleTotalHighlight } from '@/lib/xlsx-style';

// Rapport des ventes (bouton « Rapport », page Demandes) — 2 onglets :
//   • Par produit : quantité vendue + chiffre d'affaires par référence
//   • Par mois    : chiffre d'affaires par mois (commandes / devis)
// Ventes = commandes ET devis au statut « Livré » parmi les demandes filtrées de la page
// (période, responsable, recherche, onglet). Annulé / Retourné ne comptent jamais.
// Montant d'une vente = montant affiché dans l'app (même base que l'export « Exporter »).

type WorkSheet = import('xlsx-js-style').WorkSheet;

const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const NON_REPARTI = 'Devis non réparti (prix global, plusieurs produits)';

const montantToNum = (s: string) =>
  Number(String(s).replace(/\s/g, '').replace('DA', '').replace('TTC', '').replace(',', '.')) || 0;

const arrondi = (n: number) => Math.round(n * 100) / 100;

// Même produit écrit différemment (devis importés en texte libre : « 80×80 », « 57× 69 »…
// contre « 80/80 », « 57/69 » au catalogue) → même clé de regroupement.
const cleProduit = (reference: string) => reference.toLowerCase().replace(/×/g, '/').replace(/\s+/g, '');

interface LigneProduit { reference: string; categorie: string; quantite: number; nbVentes: number; ca: number }
interface LigneMois { cle: string; label: string; nbVentes: number; caCommandes: number; caDevis: number }

export async function exportVentesExcel(demandes: RequestDetail[], filtresLabel?: string) {
  const ventes = demandes.filter((r) => r.statut === 'Livré');
  const { utils, writeFile } = await import('xlsx-js-style');
  const dateExport = new Date().toLocaleDateString('fr-FR');

  // ── Agrégation ────────────────────────────────────────────────────────────
  const parProduit = new Map<string, LigneProduit>();
  const parMois = new Map<string, LigneMois>();
  let caTotal = 0;

  const ajouterProduit = (reference: string, categorie: string, quantite: number, ca: number, vus: Set<string>) => {
    const cle = cleProduit(reference);
    const p = parProduit.get(cle) ?? { reference, categorie: categorie || '—', quantite: 0, nbVentes: 0, ca: 0 };
    // Libellé affiché : celui du catalogue (avec catégorie) de préférence au texte libre
    if (p.categorie === '—' && categorie) { p.reference = reference; p.categorie = categorie; }
    p.quantite += quantite;
    p.ca += ca;
    // une vente compte une seule fois par produit, même si la référence est sur 2 lignes
    if (!vus.has(cle)) { p.nbVentes += 1; vus.add(cle); }
    parProduit.set(cle, p);
  };

  for (const r of ventes) {
    const total = montantToNum(r.montant);
    caTotal += total;

    // Par mois (date de la demande, comme le filtre de période de la page)
    const [, m, y] = (r.date ?? '').split('/').map(Number);
    const cle = `${y}-${String(m).padStart(2, '0')}`;
    const mois = parMois.get(cle) ?? { cle, label: `${MOIS_NOMS[(m || 1) - 1]} ${y}`, nbVentes: 0, caCommandes: 0, caDevis: 0 };
    mois.nbVentes += 1;
    if (r.type === 'Devis') mois.caDevis += total; else mois.caCommandes += total;
    parMois.set(cle, mois);

    // Par produit : le montant de la vente est réparti au prorata des lignes (qté × prix).
    // Sans prix par ligne : 1 seul produit → tout le montant ; plusieurs → « non réparti ».
    const lignes = r.items ?? [];
    const sommeLignes = lignes.reduce((acc, l) => acc + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
    const vus = new Set<string>();
    if (lignes.length === 0) {
      ajouterProduit(NON_REPARTI, '—', 0, total, vus);
    } else if (sommeLignes > 0) {
      for (const l of lignes) {
        const part = total * ((l.quantite || 0) * (l.prixUnitaire || 0)) / sommeLignes;
        ajouterProduit(l.designation || '—', l.categorie ?? '', l.quantite || 0, part, vus);
      }
    } else if (lignes.length === 1) {
      ajouterProduit(lignes[0].designation || '—', lignes[0].categorie ?? '', lignes[0].quantite || 0, total, vus);
    } else {
      for (const l of lignes) ajouterProduit(l.designation || '—', l.categorie ?? '', l.quantite || 0, 0, vus);
      ajouterProduit(NON_REPARTI, '—', 0, total, vus);
    }
  }

  const wb = utils.book_new();
  const entete = (titre: string, numCols: number) => {
    const rows: (string | number)[][] = [];
    const pad = (r: (string | number)[]) => { while (r.length < numCols) r.push(''); return r; };
    rows.push(pad(['PSI — Paper Solutions Industry']));
    rows.push(pad(['Centre El Qods, Niveau M1 — Chéraga, Alger | Contact@psi.dz']));
    rows.push(pad([`${titre} — ventes livrées (commandes + devis) — Exporté le ${dateExport}`]));
    rows.push(pad([filtresLabel ? `Filtres appliqués : ${filtresLabel}` : '']));
    rows.push(pad([]));
    return { rows, pad };
  };
  const mettreEnForme = (ws: WorkSheet, numCols: number, headerIdx: number, dataStart: number, dataEnd: number, totalIdx: number) => {
    ws['!merges'] = [0, 1, 2, 3].map((r) => ({ s: { r, c: 0 }, e: { r, c: numCols - 1 } }));
    styleBandRow(ws, 0, numCols, 13);
    styleBandRow(ws, 1, numCols);
    styleBandRow(ws, 2, numCols);
    if (filtresLabel) styleFiltersLine(ws, 3, 0);
    styleHeaderRow(ws, headerIdx, numCols);
    if (dataEnd >= dataStart) styleDataRows(ws, dataStart, dataEnd, numCols);
    styleTotalHighlight(ws, totalIdx, 0, 1, numCols - 1);
  };

  // ── Onglet « Par produit » (trié par CA décroissant) ──────────────────────
  {
    const NUM_COLS = 7;
    const { rows, pad } = entete('Rapport par produit', NUM_COLS);
    const headerIdx = rows.length;
    rows.push(['Référence', 'Catégorie', 'Qté vendue', 'Nb de ventes', 'CA (DA)', 'Prix moyen (DA)', '% du CA']);
    const dataStart = rows.length;
    const produits = [...parProduit.values()].sort((a, b) => b.ca - a.ca);
    for (const p of produits) {
      rows.push([
        p.reference, p.categorie, p.quantite, p.nbVentes, arrondi(p.ca),
        p.quantite > 0 && p.reference !== NON_REPARTI ? arrondi(p.ca / p.quantite) : '—',
        caTotal > 0 ? `${(p.ca / caTotal * 100).toFixed(1).replace('.', ',')} %` : '—',
      ]);
    }
    const dataEnd = rows.length - 1;
    rows.push(pad([]));
    const totalIdx = rows.length;
    rows.push(['TOTAL', '', produits.reduce((a, p) => a + p.quantite, 0), ventes.length, arrondi(caTotal), '', caTotal > 0 ? '100 %' : '—']);

    const ws = utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 34 }, { wch: 24 }, { wch: 12 }, { wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 10 }];
    mettreEnForme(ws, NUM_COLS, headerIdx, dataStart, dataEnd, totalIdx);
    utils.book_append_sheet(wb, ws, 'Par produit');
  }

  // ── Onglet « Par mois » (ordre chronologique) ────────────────────────────
  {
    const NUM_COLS = 5;
    const { rows, pad } = entete('Rapport par mois', NUM_COLS);
    const headerIdx = rows.length;
    rows.push(['Mois', 'Nb de ventes', 'CA commandes (DA)', 'CA devis (DA)', 'CA total (DA)']);
    const dataStart = rows.length;
    const mois = [...parMois.values()].sort((a, b) => a.cle.localeCompare(b.cle));
    for (const m of mois) {
      rows.push([m.label, m.nbVentes, arrondi(m.caCommandes), arrondi(m.caDevis), arrondi(m.caCommandes + m.caDevis)]);
    }
    const dataEnd = rows.length - 1;
    rows.push(pad([]));
    const totalIdx = rows.length;
    rows.push([
      'TOTAL', ventes.length,
      arrondi(mois.reduce((a, m) => a + m.caCommandes, 0)),
      arrondi(mois.reduce((a, m) => a + m.caDevis, 0)),
      arrondi(caTotal),
    ]);

    const ws = utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 18 }, { wch: 13 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    mettreEnForme(ws, NUM_COLS, headerIdx, dataStart, dataEnd, totalIdx);
    utils.book_append_sheet(wb, ws, 'Par mois');
  }

  writeFile(wb, `PSI_Rapport_ventes_${dateExport.replace(/\//g, '-')}.xlsx`);
}
