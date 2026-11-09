'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/lib/role-context';
import { LABEL_FORMATS, printLabels, type LabelData, type LabelFormat } from '@/lib/label-print';

export interface LabelEntry {
  kind: 'order' | 'quote';
  id: string;
  ref: string;
  sub?: string; // ex: nom du client
  count: number; // nombre d'étiquettes proposé par défaut (dernier nombre imprimé, sinon 1)
}

const FORMAT_KEY = 'psi-label-format';

type Step = 'setup' | 'fill' | 'choice';
interface Missing { productId: string; label: string; needGr: boolean; needMa: boolean }
type Vals = Record<string, { grammage: string; mandrin: string }>;

/** « 55 g/m² » → « 55 » : l'unité est déjà dans l'en-tête de la colonne. */
const numOnly = (s: string) => (s.trim().match(/^(\d+(?:[.,]\d+)?)/)?.[1] ?? s.trim()).replace(',', '.');

/** Clé d'une ligne : l'id du produit, ou « free:texte » pour une référence libre (pas de produit où enregistrer). */
const keyOf = (line: { productId?: string | null; designation: string }) => line.productId ?? `free:${line.designation}`;
const isFree = (key: string) => key.startsWith('free:');

/** Lignes (produits du catalogue ou références libres) auxquelles il manque le grammage et/ou le mandrin, sans doublon. */
function findMissing(labels: LabelData[]): Missing[] {
  const map = new Map<string, Missing>();
  for (const l of labels) for (const line of l.lines) {
    if (!line.askable) continue;
    const needGr = line.grammage === '—';
    const needMa = line.mandrin === '—';
    if (!needGr && !needMa) continue;
    const key = keyOf(line);
    const prev = map.get(key);
    map.set(key, { productId: key, label: line.designation, needGr: needGr || !!prev?.needGr, needMa: needMa || !!prev?.needMa });
  }
  return [...map.values()];
}

/** Applique les valeurs saisies aux lignes qui n'en ont pas (les valeurs déjà présentes sur le produit gagnent). */
function applyValues(labels: LabelData[], vals: Vals): LabelData[] {
  return labels.map((l) => ({
    ...l,
    lines: l.lines.map((line) => {
      const v = vals[keyOf(line)];
      if (!v) return line;
      return {
        ...line,
        grammage: line.grammage === '—' && v.grammage.trim() ? numOnly(v.grammage) : line.grammage,
        mandrin: line.mandrin === '—' && v.mandrin.trim() ? numOnly(v.mandrin) : line.mandrin,
      };
    }),
  }));
}

// Fenêtre « Imprimer les étiquettes » : nombre d'étiquettes PAR commande/devis + format (A4, adhésives, thermique).
// Sert pour une seule commande (détail) comme pour une sélection multiple (liste).
// Si des rouleaux n'ont pas de grammage / mandrin : étape facultative pour les renseigner, puis (admins) choix
// « Enregistrer sur le produit » ou « Juste cette fois ». Une colonne restée vide est masquée sur l'étiquette.
export function LabelPrintModal({ entries, onClose, onDone }: { entries: LabelEntry[]; onClose: () => void; onDone?: () => void }) {
  const { isAdmin } = useRole();
  const [counts, setCounts] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((e) => [e.id, String(Math.max(1, e.count))])));
  const [format, setFormat] = useState<LabelFormat>(() => {
    try { const f = localStorage.getItem(FORMAT_KEY); if (f === 'a4' || f === 'adhesive' || f === 'thermal') return f; } catch { /* stockage indisponible */ }
    return 'adhesive';
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('setup');
  const [missing, setMissing] = useState<Missing[]>([]);
  const [vals, setVals] = useState<Vals>({});

  const total = entries.reduce((s, e) => s + Math.min(200, Math.max(1, Math.floor(Number(counts[e.id]) || 1))), 0);
  const body = (dryRun: boolean) => JSON.stringify({ dryRun, entries: entries.map((e) => ({ kind: e.kind, id: e.id, count: Math.floor(Number(counts[e.id]) || 1) })) });
  const openWindow = () => {
    // Fenêtre ouverte DANS le clic (sinon bloquée comme pop-up), remplie une fois les données reçues.
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) { setError('Le navigateur a bloqué la fenêtre d\'impression : autorisez les pop-ups pour ce site.'); return null; }
    w.document.write('<p style="font-family:sans-serif;padding:24px">Préparation des étiquettes…</p>');
    return w;
  };
  const post = async (url: string, payload: string) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'Impossible de préparer les étiquettes');
    return data;
  };

  // Impression finale. `values` = grammages/mandrins saisis ; `save` = les écrire aussi sur les produits (admin).
  const run = async (values: Vals, save: boolean, existing?: Window) => {
    setError('');
    const w = existing ?? openWindow();
    if (!w) return;
    setBusy(true);
    try {
      try { localStorage.setItem(FORMAT_KEY, format); } catch { /* ignoré */ }
      const data = await post('/api/labels', body(false));
      let saveFailed = false;
      const clean: Vals = {};
      for (const [id, v] of Object.entries(values)) if (v.grammage.trim() || v.mandrin.trim()) clean[id] = v;
      // Les références libres n'ont pas de produit : utilisées pour cette impression seulement.
      const productEntries = Object.entries(clean).filter(([k]) => !isFree(k));
      if (save && productEntries.length > 0) {
        try {
          await post('/api/labels/product-fields', JSON.stringify({ items: productEntries.map(([productId, v]) => ({ productId, ...v })) }));
        } catch (e) {
          // L'impression continue : seule l'écriture sur le produit a échoué.
          saveFailed = true;
          setError(e instanceof Error ? `Étiquettes imprimées, mais pas enregistré sur le produit : ${e.message}` : 'Pas enregistré sur le produit');
        }
      }
      await printLabels(w, applyValues(data.labels as LabelData[], clean), format, data.siteUrl);
      onDone?.();
      if (!saveFailed) onClose(); // sinon la fenêtre reste ouverte pour afficher l'erreur
    } catch (e) {
      w.close();
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  // Clic « Imprimer » : on regarde d'abord s'il manque des grammages/mandrins (sans toucher au compteur de colis).
  const start = async () => {
    setError('');
    const w = openWindow();
    if (!w) return;
    setBusy(true);
    try {
      const data = await post('/api/labels', body(true));
      const miss = findMissing(data.labels as LabelData[]);
      if (miss.length === 0) {
        setBusy(false);
        await run({}, false, w); // même fenêtre : rien ne manque
        return;
      }
      w.close();
      setMissing(miss);
      setVals((prev) => ({ ...Object.fromEntries(miss.map((m) => [m.productId, { grammage: '', mandrin: '' }])), ...prev }));
      setStep('fill');
    } catch (e) {
      w.close();
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  const filled = (m: Missing) => !!((m.needGr && vals[m.productId]?.grammage.trim()) || (m.needMa && vals[m.productId]?.mandrin.trim()));
  const anyProductFilled = missing.some((m) => !isFree(m.productId) && filled(m));
  const anyFilled = missing.some((m) => (m.needGr && vals[m.productId]?.grammage.trim()) || (m.needMa && vals[m.productId]?.mandrin.trim()));
  const inputCls = 'w-full px-2 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-center text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#4CAF4F]';
  const ghostBtn = 'flex-1 px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] disabled:opacity-60';

  if (step === 'fill') {
    return (
      <Modal title="Grammage et mandrin manquants" onClose={onClose} scrollable>
        <div className="flex flex-col gap-4">
          <p className="text-[12px] text-[#4D4D4D]">
            Ces produits n&apos;ont pas de grammage ou de mandrin. Tu peux les renseigner maintenant (facultatif) : une colonne laissée vide sera masquée sur l&apos;étiquette.
          </p>
          <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
            {missing.map((m) => (
              <div key={m.productId} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <p className="text-[13px] font-bold text-[#0F172A] truncate mb-2">{m.label}{isFree(m.productId) && <span className="ml-1.5 text-[10px] font-semibold text-[#8A9BB5]">(référence libre · cette impression seulement)</span>}</p>
                <div className="grid grid-cols-2 gap-2">
                  {m.needGr && (
                    <label className="block">
                      <span className="block text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1">Grammage (g/m²)</span>
                      <input inputMode="decimal" value={vals[m.productId]?.grammage ?? ''} placeholder="ex: 55"
                        onChange={(e) => setVals((v) => ({ ...v, [m.productId]: { grammage: e.target.value, mandrin: v[m.productId]?.mandrin ?? '' } }))}
                        className={inputCls} />
                    </label>
                  )}
                  {m.needMa && (
                    <label className="block">
                      <span className="block text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide mb-1">Mandrin Ø (mm)</span>
                      <input inputMode="decimal" value={vals[m.productId]?.mandrin ?? ''} placeholder="ex: 12"
                        onChange={(e) => setVals((v) => ({ ...v, [m.productId]: { grammage: v[m.productId]?.grammage ?? '', mandrin: e.target.value } }))}
                        className={inputCls} />
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep('setup')} className={ghostBtn}>Retour</button>
            <button type="button" disabled={busy} onClick={() => run({}, false)} className={ghostBtn}>Imprimer sans</button>
            <button
              type="button" disabled={busy}
              onClick={() => { if (anyProductFilled && isAdmin) setStep('choice'); else run(vals, false); }}
              className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
              {anyFilled ? 'Continuer' : 'Imprimer'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (step === 'choice') {
    return (
      <Modal title="Enregistrer ces valeurs ?" onClose={onClose}>
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-[#4D4D4D]">Garder le grammage et le mandrin saisis sur les produits, ou seulement pour cette impression ? (Les références libres, sans produit, servent pour cette impression seulement.)</p>
          <button type="button" disabled={busy} onClick={() => run(vals, true)}
            className="text-left rounded-lg border-2 border-[#4CAF4F] bg-[#F0FDF4] px-3 py-2.5 disabled:opacity-60">
            <span className="block text-[13px] font-bold text-[#166534]">Enregistrer sur le produit</span>
            <span className="block text-[11px] text-[#4D4D4D]">Les prochaines étiquettes (et la page du client) les afficheront sans redemander.</span>
          </button>
          <button type="button" disabled={busy} onClick={() => run(vals, false)}
            className="text-left rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC] px-3 py-2.5 disabled:opacity-60">
            <span className="block text-[13px] font-bold text-[#0F172A]">Juste cette fois</span>
            <span className="block text-[11px] text-[#8A9BB5]">Utilisées pour cette impression uniquement, rien n&apos;est modifié sur le produit.</span>
          </button>
          {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}
          <button type="button" onClick={() => setStep('fill')} className={ghostBtn}>Retour</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Imprimer les étiquettes" onClose={onClose} scrollable>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">Nombre d&apos;étiquettes (colis)</p>
          <div className="flex flex-col gap-1.5 max-h-[34vh] overflow-y-auto pr-1">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#0F172A] truncate">{e.ref}</p>
                  {e.sub && <p className="text-[11px] text-[#8A9BB5] truncate">{e.sub}</p>}
                </div>
                <input
                  type="number" min={1} max={200} inputMode="numeric" value={counts[e.id] ?? '1'}
                  onChange={(ev) => setCounts((c) => ({ ...c, [e.id]: ev.target.value }))}
                  aria-label={`Nombre d'étiquettes pour ${e.ref}`}
                  className="w-20 px-2 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-center text-[13px] font-semibold text-[#0F172A] focus:outline-none focus:border-[#4CAF4F]"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">Format d&apos;impression</p>
          {LABEL_FORMATS.map((f) => (
            <label key={f.value} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer ${format === f.value ? 'border-[#4CAF4F] bg-[#F0FDF4]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
              <input type="radio" name="label-format" checked={format === f.value} onChange={() => setFormat(f.value)} className="mt-1 accent-[#4CAF4F]" />
              <span>
                <span className="block text-[13px] font-semibold text-[#0F172A]">{f.label}</span>
                <span className="block text-[11px] text-[#8A9BB5]">{f.hint}</span>
              </span>
            </label>
          ))}
        </div>

        {error && <p className="text-[12px] text-red-600 font-medium">{error}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={ghostBtn}>Annuler</button>
          <button type="button" disabled={busy} onClick={start} className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {busy ? 'Préparation…' : `Imprimer (${total})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
