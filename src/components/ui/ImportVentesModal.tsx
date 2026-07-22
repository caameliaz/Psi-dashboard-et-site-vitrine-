'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

// Import d'un Excel de ventes passées (commandes + devis déjà réalisés).
// Colonnes attendues : Date · N° Facture · Client · Commercial · Wilaya ·
// Référence · Quantité · Prix Unitaire · Montant · Mode Paiement · Date Règlement
//
// La détection des colonnes est TOLÉRANTE : "N° Facture", "Facture", "num facture"…
// sont tous reconnus (correspondance exacte, puis partielle).

interface Resultat {
  total: number;
  commandes: number;
  devis: number;
  clientsCrees: number;
  erreurs: string[];
}

export function ImportVentesModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Resultat | null>(null);

  const norm = (s: string) => String(s ?? '').trim().toLowerCase();

  /** Retrouve une colonne : correspondance exacte, puis partielle. */
  const pick = (obj: Record<string, unknown>, keys: string[]) => {
    for (const k of Object.keys(obj)) {
      if (keys.includes(norm(k))) { const v = obj[k]; return v == null ? '' : String(v).trim(); }
    }
    for (const k of Object.keys(obj)) {
      const h = norm(k);
      if (keys.some((key) => h.includes(key))) { const v = obj[k]; return v == null ? '' : String(v).trim(); }
    }
    return '';
  };

  const handleFile = async (file: File) => {
    setError(''); setResult(null); setParsing(true); setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      const feuille = wb.Sheets[wb.SheetNames[0]];
      // ⚠️ Beaucoup d'exports Excel ont des lignes de titre AVANT les en-têtes
      // (ex. "Détails pour Somme de Montant" en ligne 1, en-têtes en ligne 3).
      // On lit donc la feuille en brut et on CHERCHE la ligne d'en-têtes.
      const grille = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, defval: '' });

      const estEntete = (ligne: unknown[]) => {
        const cells = ligne.map((c) => norm(String(c ?? '')));
        // La ligne d'en-têtes contient forcément un "client" et une "date"
        return cells.some((c) => c.includes('client')) && cells.some((c) => c.includes('date'));
      };

      const idxEntete = grille.findIndex(estEntete);
      if (idxEntete === -1) {
        setError("Colonnes introuvables. Le fichier doit contenir au moins « Date » et « Client ».");
        setRows([]);
        return;
      }

      const entetes = (grille[idxEntete] as unknown[]).map((c) => String(c ?? '').trim());
      const brut = grille
        .slice(idxEntete + 1)
        .filter((l) => (l as unknown[]).some((c) => String(c ?? '').trim() !== '')) // ignore les lignes vides
        .map((l) => {
          const obj: Record<string, unknown> = {};
          entetes.forEach((h, i) => { if (h) obj[h] = (l as unknown[])[i] ?? ''; });
          return obj;
        });

      if (brut.length === 0) { setError('Aucune ligne de données trouvée sous les en-têtes.'); setRows([]); return; }
      setRows(brut);
    } catch {
      setError('Impossible de lire ce fichier. Format attendu : .xlsx ou .csv');
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const lignesPreparees = rows.map((r) => ({
    date:          pick(r, ['date', 'date commande', 'date vente']),
    facture:       pick(r, ['n° facture', 'no facture', 'num facture', 'facture', 'n°facture']),
    client:        pick(r, ['client', 'nom client', 'entreprise']),
    commercial:    pick(r, ['commercial', 'agent', 'responsable', 'vendeur']),
    wilaya:        pick(r, ['wilaya']),
    reference:     pick(r, ['référence', 'reference', 'ref', 'réf', 'produit']),
    quantite:      pick(r, ['quantité', 'quantite', 'qté', 'qte', 'qty']),
    prixUnitaire:  pick(r, ['prix unitaire', 'prix', 'pu', 'prix unit']),
    montant:       pick(r, ['montant', 'total']),
    modePaiement:  pick(r, ['mode paiement', 'mode de paiement', 'paiement', 'règlement mode']),
    dateReglement: pick(r, ['date règlement', 'date reglement', 'règlement', 'reglement']),
  }));

  const handleImport = async () => {
    setImporting(true); setError('');
    try {
      const res = await fetch('/api/ventes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: lignesPreparees }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Échec de l'import."); return; }
      setResult(data);
      onDone();
    } catch {
      setError('Erreur réseau pendant l’import.');
    } finally {
      setImporting(false);
    }
  };

  // ── Écran de résultat ──
  if (result) {
    return (
      <Modal title="Import terminé" onClose={onClose}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Commandes', valeur: result.commandes, couleur: '#166534', fond: '#F0FDF4' },
              { label: 'Devis', valeur: result.devis, couleur: '#5B21B6', fond: '#F5F3FF' },
              { label: 'Clients créés', valeur: result.clientsCrees, couleur: '#1E40AF', fond: '#EFF6FF' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl px-4 py-3 text-center" style={{ background: c.fond }}>
                <p className="text-[22px] font-extrabold" style={{ color: c.couleur }}>{c.valeur}</p>
                <p className="text-[11px] font-semibold text-[#8A9BB5]">{c.label}</p>
              </div>
            ))}
          </div>

          {result.erreurs.length > 0 && (
            <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
              <p className="text-[12px] font-bold text-[#9A3412] mb-1">
                {result.erreurs.length} ligne(s) ignorée(s)
              </p>
              <ul className="text-[11px] text-[#9A3412] list-disc pl-4 max-h-[140px] overflow-y-auto">
                {result.erreurs.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white" style={{ background: '#4CAF4F' }}>
            Fermer
          </button>
        </div>
      </Modal>
    );
  }

  // ── Écran de sélection / aperçu ──
  return (
    <Modal title="Importer des ventes (Excel)" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[12px] text-[#8A9BB5] leading-relaxed">
          Colonnes attendues : <b>Date · N° Facture · Client · Commercial · Wilaya · Référence ·
          Quantité · Prix Unitaire · Montant · Mode Paiement · Date Règlement</b>.
        </p>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[11px] text-[#374151] leading-relaxed">
          <p className="font-bold text-[#0F172A] mb-1">Règles appliquées</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>La <b>date de l’Excel</b> est conservée (pas la date du jour)</li>
            <li>Référence <b>au catalogue</b> → commande · sinon → devis</li>
            <li>N° de facture commençant par <b>F</b> → TVA activée</li>
            <li>Plusieurs lignes avec le <b>même n° de facture</b> → une seule demande</li>
            <li>Tout est enregistré au statut <b>Livré</b></li>
          </ul>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E2E8F0] py-8 cursor-pointer hover:border-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
          <svg width={26} height={26} fill="none" viewBox="0 0 24 24">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="#4CAF4F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[13px] font-semibold text-[#374151]">
            {fileName || 'Choisir un fichier Excel'}
          </span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        </label>

        {parsing && <p className="text-[12px] text-[#8A9BB5]">Lecture du fichier…</p>}
        {error && <p className="text-[12px] text-[#EF4444] bg-[#FEF2F2] rounded-xl px-4 py-3 border border-[#FECACA]">{error}</p>}

        {rows.length > 0 && (
          <>
            <p className="text-[12px] font-semibold text-[#0F172A]">
              {rows.length} ligne(s) détectée(s) — aperçu des 3 premières :
            </p>
            <div className="rounded-xl border border-[#E2E8F0] overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {['Date', 'Facture', 'Client', 'Référence', 'Qté', 'P.U.'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-[#8A9BB5]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignesPreparees.slice(0, 3).map((l, i) => (
                    <tr key={i} className="border-t border-[#F2F4F7]">
                      <td className="px-3 py-2">{l.date || '—'}</td>
                      <td className="px-3 py-2">{l.facture || '—'}</td>
                      <td className="px-3 py-2 truncate max-w-[120px]">{l.client || '—'}</td>
                      <td className="px-3 py-2">{l.reference || '—'}</td>
                      <td className="px-3 py-2">{l.quantite || '—'}</td>
                      <td className="px-3 py-2">{l.prixUnitaire || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">
                Annuler
              </button>
              <button onClick={handleImport} disabled={importing}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
                {importing ? 'Import en cours…' : `Importer ${rows.length} ligne(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
