'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LABEL_FORMATS, printLabels, type LabelData, type LabelFormat } from '@/lib/label-print';

export interface LabelEntry {
  kind: 'order' | 'quote';
  id: string;
  ref: string;
  sub?: string; // ex: nom du client
  count: number; // nombre d'étiquettes proposé par défaut (dernier nombre imprimé, sinon 1)
}

const FORMAT_KEY = 'psi-label-format';

// Fenêtre « Imprimer les étiquettes » : nombre d'étiquettes PAR commande/devis + format (A4, adhésives, thermique).
// Sert pour une seule commande (détail) comme pour une sélection multiple (liste).
export function LabelPrintModal({ entries, onClose, onDone }: { entries: LabelEntry[]; onClose: () => void; onDone?: () => void }) {
  const [counts, setCounts] = useState<Record<string, string>>(() => Object.fromEntries(entries.map((e) => [e.id, String(Math.max(1, e.count))])));
  const [format, setFormat] = useState<LabelFormat>(() => {
    try { const f = localStorage.getItem(FORMAT_KEY); if (f === 'a4' || f === 'adhesive' || f === 'thermal') return f; } catch { /* stockage indisponible */ }
    return 'adhesive';
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = entries.reduce((s, e) => s + Math.min(200, Math.max(1, Math.floor(Number(counts[e.id]) || 1))), 0);

  const print = async () => {
    setError('');
    // Fenêtre ouverte DANS le clic (sinon bloquée comme pop-up), remplie une fois les données reçues.
    const w = window.open('', '_blank', 'width=900,height=900');
    if (!w) { setError('Le navigateur a bloqué la fenêtre d\'impression : autorisez les pop-ups pour ce site.'); return; }
    w.document.write('<p style="font-family:sans-serif;padding:24px">Préparation des étiquettes…</p>');
    setBusy(true);
    try {
      try { localStorage.setItem(FORMAT_KEY, format); } catch { /* ignoré */ }
      const res = await fetch('/api/labels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: entries.map((e) => ({ kind: e.kind, id: e.id, count: Math.floor(Number(counts[e.id]) || 1) })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Impossible de préparer les étiquettes');
      await printLabels(w, data.labels as LabelData[], format, data.siteUrl);
      onDone?.();
      onClose();
    } catch (e) {
      w.close();
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

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
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">Annuler</button>
          <button type="button" disabled={busy} onClick={print} className="flex-1 px-3 py-2.5 rounded-lg text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {busy ? 'Préparation…' : `Imprimer (${total})`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
