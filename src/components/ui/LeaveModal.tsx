'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AdminSelect } from '@/components/ui/AdminSelect';

interface ClientOption { id: string; name: string; company: string | null; }

// Un bloc = un groupe de clients confiés à UN remplaçant (permet de diviser les
// clients entre plusieurs personnes différentes en plusieurs congés créés en une
// fois — cf. handleSubmit qui envoie un POST /api/leaves par bloc).
interface Block { id: number; clientIds: string[]; substituteId: string }

// Modal "Mettre en congé" — ouverte depuis la fiche employé (page Utilisateurs).
// Flux : on sélectionne des clients dans un bloc, on choisit son remplaçant, puis
// "+ Ajouter une personne" ouvre un nouveau bloc pour répartir le RESTE des clients
// (déjà pris dans un bloc précédent → exclus des blocs suivants) vers quelqu'un d'autre.
export function LeaveModal({ employeeId, employeeName, onClose, onCreated }: {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";

  const [substitutes, setSubstitutes] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([{ id: 0, clientIds: [], substituteId: '' }]);
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

  // Clients déjà pris dans un AUTRE bloc que celui-ci — exclus de sa liste de choix.
  const takenElsewhere = (blockId: number) =>
    new Set(blocks.filter((b) => b.id !== blockId).flatMap((b) => b.clientIds));

  const availableFor = (blockId: number) => {
    const taken = takenElsewhere(blockId);
    return clients.filter((c) => !taken.has(c.id));
  };

  const toggleClient = (blockId: number, clientId: string) =>
    setBlocks((prev) => prev.map((b) => b.id === blockId
      ? { ...b, clientIds: b.clientIds.includes(clientId) ? b.clientIds.filter((c) => c !== clientId) : [...b.clientIds, clientId] }
      : b));

  const toggleAllFor = (blockId: number) =>
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      const available = availableFor(blockId);
      const allSelected = available.length > 0 && available.every((c) => b.clientIds.includes(c.id));
      return { ...b, clientIds: allSelected ? [] : available.map((c) => c.id) };
    }));

  const setSubstituteFor = (blockId: number, substituteId: string) =>
    setBlocks((prev) => prev.map((b) => b.id === blockId ? { ...b, substituteId } : b));

  const addBlock = () => setBlocks((prev) => [...prev, { id: Math.max(...prev.map((b) => b.id)) + 1, clientIds: [], substituteId: '' }]);
  const removeBlock = (blockId: number) => setBlocks((prev) => prev.filter((b) => b.id !== blockId));

  const totalAssigned = blocks.reduce((n, b) => n + b.clientIds.length, 0);
  const remainingClients = clients.length - totalAssigned;

  const handleSubmit = async () => {
    setError('');
    if (!endDate) { setError('⚠️ Indiquez la date de fin du congé'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('⚠️ La date de fin doit être après la date de début'); return; }
    const activeBlocks = blocks.filter((b) => b.clientIds.length > 0);
    if (activeBlocks.length === 0) { setError('⚠️ Sélectionnez au moins un client et un remplaçant'); return; }
    const missingSubstitute = activeBlocks.find((b) => !b.substituteId);
    if (missingSubstitute) { setError('⚠️ Choisissez un remplaçant pour chaque groupe de clients'); return; }

    setSaving(true);
    try {
      // Un POST /api/leaves par bloc — chacun crée son propre congé (même employé,
      // remplaçant différent, sous-ensemble de clients différent).
      for (const block of activeBlocks) {
        const res = await fetch('/api/leaves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId, substituteId: block.substituteId, startDate, endDate,
            clientIds: block.clientIds, allowFullHistory,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? 'Échec de la création du congé.');
          return;
        }
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

        {clients.length === 0 ? (
          <p className="text-[12px] text-[#8A9BB5]">Aucun client actuellement assigné à cet employé.</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, idx) => {
              const available = availableFor(block.id);
              const allSelected = available.length > 0 && available.every((c) => block.clientIds.includes(c.id));
              return (
                <div key={block.id} className="rounded-xl border border-[#E2E8F0] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[12px] font-semibold text-[#374151]">
                      {blocks.length > 1 ? `Groupe ${idx + 1} — clients` : 'Clients à confier'}
                    </label>
                    <div className="flex items-center gap-2">
                      {available.length > 0 && (
                        <button onClick={() => toggleAllFor(block.id)} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">
                          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                      )}
                      {blocks.length > 1 && (
                        <button onClick={() => removeBlock(block.id)} className="text-[11px] font-semibold text-[#EF4444] hover:underline">
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>

                  {available.length === 0 ? (
                    <p className="text-[12px] text-[#8A9BB5] py-2">Tous les clients sont déjà répartis dans un autre groupe.</p>
                  ) : (
                    <div className="max-h-[140px] overflow-y-auto flex flex-col gap-1 rounded-lg border border-[#F0F4F8] p-2 mb-2">
                      {available.map((c) => {
                        const checked = block.clientIds.includes(c.id);
                        return (
                          <div key={c.id} onClick={() => toggleClient(block.id, c.id)}
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

                  <label className="block text-[11px] font-semibold text-[#374151] mb-1">Assigné à</label>
                  <AdminSelect
                    className="w-full"
                    value={block.substituteId}
                    onChange={(v) => setSubstituteFor(block.id, v)}
                    options={[{ value: '', label: 'Choisir un remplaçant…' }, ...substitutes.map((s) => ({ value: s.id, label: s.name }))]}
                  />
                </div>
              );
            })}

            {remainingClients > 0 && (
              <button onClick={addBlock} className="text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C]">
                + Ajouter une personne ({remainingClients} client{remainingClients > 1 ? 's' : ''} restant{remainingClients > 1 ? 's' : ''})
              </button>
            )}
          </div>
        )}

        <div onClick={() => setAllowFullHistory((v) => !v)}
          className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
          style={{ background: allowFullHistory ? '#F0FDF4' : '#F8FAFC', border: `1.5px solid ${allowFullHistory ? '#BBF7D0' : '#F2F4F7'}` }}>
          <div className="w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center mt-0.5"
            style={{ background: allowFullHistory ? '#4CAF4F' : 'white', borderColor: allowFullHistory ? '#4CAF4F' : '#D1D5DB' }}>
            {allowFullHistory && <svg width={8} height={8} viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ color: allowFullHistory ? '#166534' : '#374151' }}>
              Les remplaçants voient tout l&apos;historique
            </p>
            <p className="text-[11px] text-[#8A9BB5] mt-0.5">
              Sinon ils ne verront que les commandes/devis créés pendant leur intérim (à partir du {new Date(startDate).toLocaleDateString('fr-FR')}).
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
