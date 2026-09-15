'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AdminSelect } from '@/components/ui/AdminSelect';

interface ClientOption { id: string; name: string; company: string | null; }

// Modal "Mettre en congé" — ouverte depuis la fiche employé (page Utilisateurs).
// Demande le remplaçant, la durée, les clients à confier, et si le remplaçant
// voit aussi l'historique complet de ces clients (pas seulement les nouvelles
// commandes créées pendant l'intérim).
export function LeaveModal({ employeeId, employeeName, onClose, onCreated }: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";

  const [substitutes, setSubstitutes] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [substituteId, setSubstituteId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [allowFullHistory, setAllowFullHistory] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/users?assignable=true').then((r) => r.ok ? r.json() : []).then((all: { id: string; name: string }[]) => {
      setSubstitutes(all.filter((u) => u.id !== employeeId));
    }).catch(() => {});
    // Clients actuellement assignés à cet employé — seuls réassignables pour ce congé.
    fetch('/api/clients').then((r) => r.ok ? r.json() : []).then((all: any[]) => {
      const owned = all.filter((c) => c.assignedToId === employeeId);
      setClients(owned.map((c) => ({ id: c.id, name: c.name, company: c.company })));
    }).catch(() => {});
  }, [employeeId]);

  const allSelected = clients.length > 0 && selectedClientIds.length === clients.length;
  const toggleClient = (id: string) =>
    setSelectedClientIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  const toggleAll = () => setSelectedClientIds(allSelected ? [] : clients.map((c) => c.id));

  const handleSubmit = async () => {
    setError('');
    if (!substituteId) { setError('⚠️ Choisissez un remplaçant'); return; }
    if (!endDate) { setError('⚠️ Indiquez la date de fin du congé'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('⚠️ La date de fin doit être après la date de début'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId, substituteId, startDate, endDate,
          clientIds: selectedClientIds, allowFullHistory,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Échec de la création du congé.');
        return;
      }
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Mettre ${employeeName} en congé`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Responsable par intérim</label>
          <AdminSelect
            className="w-full"
            value={substituteId}
            onChange={setSubstituteId}
            options={[{ value: '', label: 'Choisir un remplaçant…' }, ...substitutes.map((s) => ({ value: s.id, label: s.name }))]}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-semibold text-[#374151]">Clients à confier</label>
            {clients.length > 0 && (
              <button onClick={toggleAll} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>
          {clients.length === 0 ? (
            <p className="text-[12px] text-[#8A9BB5]">Aucun client actuellement assigné à cet employé.</p>
          ) : (
            <div className="max-h-[180px] overflow-y-auto flex flex-col gap-1 rounded-xl border border-[#E2E8F0] p-2">
              {clients.map((c) => {
                const checked = selectedClientIds.includes(c.id);
                return (
                  <div key={c.id} onClick={() => toggleClient(c.id)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: checked ? '#F0FDF4' : 'transparent' }}>
                    <div className="w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center"
                      style={{ background: checked ? '#4CAF4F' : 'white', borderColor: checked ? '#4CAF4F' : '#D1D5DB' }}>
                      {checked && <svg width={8} height={8} viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-[13px] text-[#374151]">{c.company ?? c.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div onClick={() => setAllowFullHistory((v) => !v)}
          className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
          style={{ background: allowFullHistory ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${allowFullHistory ? '#BBF7D0' : '#F2F4F7'}` }}>
          <div className="w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5"
            style={{ background: allowFullHistory ? '#4CAF4F' : 'white', borderColor: allowFullHistory ? '#4CAF4F' : '#D1D5DB' }}>
            {allowFullHistory && <svg width={8} height={8} viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ color: allowFullHistory ? '#166534' : '#374151' }}>
              Le remplaçant voit tout l&apos;historique
            </p>
            <p className="text-[11px] text-[#8A9BB5] mt-0.5">
              Sinon il ne verra que les commandes/devis créés pendant son intérim (à partir du {new Date(startDate).toLocaleDateString('fr-FR')}).
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Création…' : 'Mettre en congé'}
          </button>
        </div>
        {error && <p className="text-[12px] font-semibold text-[#EF4444] text-center">{error}</p>}
      </div>
    </Modal>
  );
}
