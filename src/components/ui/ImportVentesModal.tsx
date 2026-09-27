'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

// Import d'un Excel de ventes passées (commandes + devis déjà réalisés).
// Colonnes attendues : Date · N° Facture · Client · Commercial · Wilaya ·
// Référence · Quantité · Prix Unitaire · Montant · Mode Paiement · Date Règlement
//
// La détection des colonnes est TOLÉRANTE : "N° Facture", "Facture", "num facture"…
// sont tous reconnus (correspondance exacte, puis partielle).
//
// Doublons : dès que le fichier est lu, le serveur compare chaque vente à la base
// (POST mode 'verifier', rien n'est écrit). Les doublons sont ignorés par défaut ;
// l'utilisatrice peut en cocher un pour l'importer quand même (`forcer`).

interface Resultat {
  total: number;
  commandes: number;
  devis: number;
  clientsCrees: number;
  erreurs: string[];
  doublonsIgnores?: number;
  ignores?: string[];
}

interface GroupeVerifie {
  cle: string;
  lignes: number[];
  date: string;
  facture: string;
  client: string;
  montant: number;
  doublon: string | null;
}

type LignePreparee = Record<'date' | 'facture' | 'client' | 'commercial' | 'wilaya' | 'reference' | 'quantite' | 'prixUnitaire' | 'montant' | 'modePaiement' | 'dateReglement', string>;

export function ImportVentesModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Resultat | null>(null);
  // Vérification des doublons (avant import)
  const [verification, setVerification] = useState<GroupeVerifie[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [forcer, setForcer] = useState<Set<string>>(new Set());

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

  const preparer = (lignes: Record<string, unknown>[]): LignePreparee[] => lignes.map((r) => ({
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

  const verifier = async (lignes: LignePreparee[]) => {
    setVerifying(true); setVerification(null); setForcer(new Set());
    try {
      const res = await fetch('/api/ventes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: lignes, mode: 'verifier' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Vérification des doublons impossible.'); return; }
      setVerification(data.groupes ?? []);
    } catch {
      setError('Erreur réseau pendant la vérification des doublons.');
    } finally {
      setVerifying(false);
    }
  };

  const handleFile = async (file: File) => {
    setError(''); setResult(null); setVerification(null); setParsing(true); setFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      // ⚠️ Le classeur peut contenir plusieurs feuilles (ex. "Détails1" + "RECAP").
      // On cherche CELLE qui contient un vrai tableau de ventes, au lieu de
      // prendre systématiquement la première.
      const estEnteteLigne = (ligne: unknown[]) => {
        const cells = (ligne ?? []).map((c) => norm(String(c ?? '')));
        return cells.some((c) => c.includes('client')) && cells.some((c) => c.includes('date'));
      };

      let feuille = wb.Sheets[wb.SheetNames[0]];
      for (const nom of wb.SheetNames) {
        const test = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nom], { header: 1, defval: '' });
        if (test.some(estEnteteLigne)) { feuille = wb.Sheets[nom]; break; }
      }
      // ⚠️ Beaucoup d'exports Excel ont des lignes de titre AVANT les en-têtes
      // (ex. "Détails pour Somme de Montant" en ligne 1, en-têtes en ligne 3).
      // On lit donc la feuille en brut et on CHERCHE la ligne d'en-têtes.
      const grille = XLSX.utils.sheet_to_json<unknown[]>(feuille, { header: 1, defval: '' });

      const idxEntete = grille.findIndex(estEnteteLigne);
      if (idxEntete === -1) {
        setError("Colonnes introuvables. Le fichier doit contenir au moins « Date » et « Client ».");
        setRows([]);
        return;
      }

      const entetes = (grille[idxEntete] as unknown[]).map((c) => String(c ?? '').trim());
      const brut = grille
        .slice(idxEntete + 1)
        // ⚠️ Un tableau Excel s'étend souvent sur des milliers de lignes vides
        // (avec un simple 0 calculé). On ne garde que celles ayant un CLIENT.
        .filter((l) => {
          const cells = l as unknown[];
          const iClient = entetes.findIndex((h) => norm(h).includes('client'));
          return iClient >= 0 && String(cells[iClient] ?? '').trim() !== '';
        })
        .map((l) => {
          const obj: Record<string, unknown> = {};
          entetes.forEach((h, i) => { if (h) obj[h] = (l as unknown[])[i] ?? ''; });
          return obj;
        });

      if (brut.length === 0) { setError('Aucune ligne de données trouvée sous les en-têtes.'); setRows([]); return; }
      setRows(brut);
      await verifier(preparer(brut));
    } catch {
      setError('Impossible de lire ce fichier. Format attendu : .xlsx ou .csv');
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const lignesPreparees = preparer(rows);
  const doublons = (verification ?? []).filter((g) => g.doublon);
  const nouvelles = (verification ?? []).filter((g) => !g.doublon);
  const aImporter = nouvelles.length + doublons.filter((g) => forcer.has(g.cle)).length;

  const handleImport = async () => {
    setImporting(true); setError('');
    try {
      const res = await fetch('/api/ventes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: lignesPreparees, forcer: [...forcer] }),
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
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Commandes créées', valeur: result.commandes, couleur: '#166534', fond: '#F0FDF4' },
              { label: 'Devis créés', valeur: result.devis, couleur: '#5B21B6', fond: '#F5F3FF' },
              { label: 'Clients créés', valeur: result.clientsCrees, couleur: '#1E40AF', fond: '#EFF6FF' },
              { label: 'Doublons ignorés', valeur: result.doublonsIgnores ?? 0, couleur: '#9A3412', fond: '#FFF7ED' },
            ].map((c) => (
              <div key={c.label} className="rounded-xl px-4 py-3 text-center" style={{ background: c.fond }}>
                <p className="text-[22px] font-extrabold" style={{ color: c.couleur }}>{c.valeur}</p>
                <p className="text-[11px] font-semibold text-[#8A9BB5]">{c.label}</p>
              </div>
            ))}
          </div>

          {(result.ignores?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
              <p className="text-[12px] font-bold text-[#9A3412] mb-1">Doublons ignorés (déjà en base)</p>
              <ul className="text-[11px] text-[#9A3412] list-disc pl-4 max-h-[120px] overflow-y-auto">
                {result.ignores!.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {result.erreurs.length > 0 && (
            <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
              <p className="text-[12px] font-bold text-[#991B1B] mb-1">
                {result.erreurs.length} vente(s) non importée(s) (erreur dans le fichier)
              </p>
              <ul className="text-[11px] text-[#991B1B] list-disc pl-4 max-h-[120px] overflow-y-auto">
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
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[11px] text-[#374151] leading-relaxed">
          <p className="font-bold text-[#0F172A] mb-1">Colonnes du fichier</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li><b>Date</b> (obligatoire) : <b>JJ/MM/AAAA</b> (ex. 26/07/2026), aussi 26-07-2026, 26.07.26 ou une date Excel</li>
            <li><b>Client</b> (obligatoire) : nom du client ; les lignes sans client sont ignorées</li>
            <li><b>N° Facture</b> : ex. F006-2026 ou BL ; peut être vide</li>
            <li><b>Référence</b> : référence produit, écrite comme au catalogue (ex. 80/80)</li>
            <li><b>Quantité</b> : nombre entier (ex. 48)</li>
            <li><b>Prix unitaire</b> et <b>Montant</b> : en DA, virgule ou point acceptés (ex. 165 ou 111,027)</li>
            <li><b>Commercial</b>, <b>Wilaya</b>, <b>Mode paiement</b>, <b>Date règlement</b> (JJ/MM/AAAA) : facultatifs</li>
          </ul>
          <p className="text-[#8A9BB5] mt-1">Les noms de colonnes peuvent varier (« Facture », « N° facture », « Qté »…). Les lignes de titre au-dessus du tableau sont ignorées.</p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[11px] text-[#374151] leading-relaxed">
          <p className="font-bold text-[#0F172A] mb-1">Règles appliquées</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>La <b>date du fichier</b> devient la date de la vente <b>et</b> sa date de livraison (pas la date du jour)</li>
            <li>Tout est enregistré au statut <b>Livré</b> et compte dans les ventes du dashboard</li>
            <li>Plusieurs lignes avec le <b>même n° de facture</b> → une seule vente à plusieurs produits ; sans n° → une vente par ligne</li>
            <li>Toutes les références <b>au catalogue</b> → <b>commande</b> (montant = quantité × prix unitaire) · sinon → <b>devis</b> (montant = colonne Montant)</li>
            <li>N° de facture commençant par <b>F</b> → TVA « Oui » ; les montants du fichier sont considérés <b>TTC</b> (aucune TVA ajoutée)</li>
            <li>Le <b>n° de facture</b> devient la référence de la vente (sinon CMD-… / DEV-… automatique)</li>
            <li><b>Client</b> retrouvé par son nom exact ; s’il n’existe pas, il est <b>créé</b> (avec la wilaya du fichier)</li>
            <li>Le <b>commercial</b> est gardé par son nom ; mode et date de règlement sont enregistrés</li>
            <li><b>Doublons</b> : une vente déjà en base (même n° de facture, ou même client + même jour + même montant) ou répétée dans le fichier est <b>ignorée</b>, sauf si vous la cochez</li>
            <li>Aucun effet sur le stock</li>
          </ul>
        </div>

        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E2E8F0] py-6 cursor-pointer hover:border-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
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
        {verifying && <p className="text-[12px] text-[#8A9BB5]">Recherche des ventes déjà importées…</p>}
        {error && <p className="text-[12px] text-[#EF4444] bg-[#FEF2F2] rounded-xl px-4 py-3 border border-[#FECACA]">{error}</p>}

        {rows.length > 0 && verification && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl px-4 py-3 text-center bg-[#F0FDF4]">
                <p className="text-[22px] font-extrabold text-[#166534]">{nouvelles.length}</p>
                <p className="text-[11px] font-semibold text-[#8A9BB5]">nouvelle(s) vente(s)</p>
              </div>
              <div className="rounded-xl px-4 py-3 text-center" style={{ background: doublons.length ? '#FFF7ED' : '#F8FAFC' }}>
                <p className="text-[22px] font-extrabold" style={{ color: doublons.length ? '#9A3412' : '#8A9BB5' }}>{doublons.length}</p>
                <p className="text-[11px] font-semibold text-[#8A9BB5]">déjà en base (ignorée{doublons.length > 1 ? 's' : ''})</p>
              </div>
            </div>

            {doublons.length > 0 && (
              <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2">
                <p className="text-[12px] font-bold text-[#9A3412] mb-1">Doublons détectés — cochez seulement ceux à importer quand même</p>
                <ul className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                  {doublons.map((g) => (
                    <li key={g.cle}>
                      <label className="flex items-start gap-2 text-[11px] text-[#7C2D12] cursor-pointer">
                        <input type="checkbox" className="mt-0.5 accent-[#4CAF4F]" checked={forcer.has(g.cle)}
                          onChange={(e) => setForcer((prev) => { const n = new Set(prev); if (e.target.checked) n.add(g.cle); else n.delete(g.cle); return n; })} />
                        <span>
                          <b>{g.date || '—'} · {g.client || '—'}{g.facture ? ` · ${g.facture}` : ''} · {g.montant.toLocaleString('fr-FR')} DA</b>
                          <span className="text-[#8A9BB5]"> (ligne {g.lignes.join(', ')})</span><br />
                          {g.doublon}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[12px] font-semibold text-[#0F172A]">
              {rows.length} ligne(s) dans le fichier — aperçu des 3 premières :
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
              <button onClick={handleImport} disabled={importing || aImporter === 0}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
                {importing ? 'Import en cours…' : aImporter === 0 ? 'Rien à importer' : `Importer ${aImporter} vente(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
