'use client';

import { useState } from 'react';
import { Modal } from './Modal';

// Modifier une référence LIBRE : son texte et son métrage entre parenthèses (comme « 57/69 (60 m) »).
// Le nouveau texte est appliqué partout (commandes, devis, stock, recette, listes) par /api/free-text-recipes/rename.
const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

// « 57/69 (60 metres) » → { base: '57/69', metrage: '60' } ; sans parenthèses de métrage → tout le texte en base
function parseLabel(label: string) {
  const m = label.match(/^(.*?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*(?:m|mètres?|metres?)\s*\)\s*$/i);
  return m ? { base: m[1].trim(), metrage: m[2].replace(',', '.') } : { base: label.trim(), metrage: '' };
}

export const buildFreeLabel = (base: string, metrage: string) => (metrage.trim() ? `${base.trim()} (${metrage.trim()} m)` : base.trim());

export function FreeRefEditModal({ label, onClose, onSaved }: { label: string; onClose: () => void; onSaved: () => void }) {
  const initial = parseLabel(label);
  const [base, setBase] = useState(initial.base);
  const [metrage, setMetrage] = useState(initial.metrage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const next = buildFreeLabel(base, metrage);
  const changed = next !== label && base.trim() !== '';

  const save = async () => {
    if (!changed || saving) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/free-text-recipes/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: label, to: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'Échec de la modification.'); return; }
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Modifier — ${label}`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Référence</label>
          <input value={base} onChange={(e) => setBase(e.target.value)} className={inputClass} autoFocus />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Métrage (m) <span className="font-normal text-[#8A9BB5]">— facultatif, affiché entre parenthèses</span></label>
          <input value={metrage} onChange={(e) => setMetrage(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="ex: 60" className={inputClass} />
        </div>
        <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2.5">
          <p className="text-[11px] font-bold text-[#8A9BB5] uppercase">Résultat</p>
          <p className="text-[14px] font-bold text-[#0F172A]">{next || '—'}</p>
          <p className="text-[11px] text-[#8A9BB5] mt-1">Ce texte remplace l&apos;ancien dans toutes les commandes, tous les devis, le stock et la recette de cette référence.</p>
        </div>
        {error && <p className="text-[12px] font-semibold text-[#B91C1C]">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={save} disabled={!changed || saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-50 transition-colors" style={{ background: '#4CAF4F' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
