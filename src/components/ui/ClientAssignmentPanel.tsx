'use client';

import { useState, useEffect } from 'react';

interface ClientOption { id: string; name: string; company: string | null; assignedToId: string | null; }

// Bloc "Clients assignés" affiché dans la fiche employé (page Utilisateurs) :
// liste les clients dont cet employé est responsable, permet d'en ajouter/retirer
// via une recherche parmi tous les clients. Sauvegarde en masse via /api/clients/assign.
export function ClientAssignmentPanel({ userId }: { userId: string }) {
  const [allClients, setAllClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchClients = () => {
    setLoading(true);
    fetch('/api/clients')
      .then((r) => r.ok ? r.json() : [])
      .then((data: any[]) => setAllClients(data.map((c) => ({ id: c.id, name: c.name, company: c.company, assignedToId: c.assignedToId ?? null }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchClients, [userId]);

  const ownedClients = allClients.filter((c) => c.assignedToId === userId);

  const startEdit = () => {
    setSelectedIds(ownedClients.map((c) => c.id));
    setEditing(true);
  };

  const toggle = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const save = async () => {
    setSaving(true);
    try {
      const previouslyOwned = new Set(ownedClients.map((c) => c.id));
      const nowOwned = new Set(selectedIds);
      const toAssign = selectedIds.filter((id) => !previouslyOwned.has(id));
      const toRemove = [...previouslyOwned].filter((id) => !nowOwned.has(id));

      await Promise.all([
        toAssign.length ? fetch('/api/clients/assign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientIds: toAssign, assignedToId: userId }),
        }) : null,
        toRemove.length ? fetch('/api/clients/assign', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientIds: toRemove, assignedToId: null }),
        }) : null,
      ]);
      setEditing(false);
      fetchClients();
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? allClients.filter((c) => c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q))
    : allClients;

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold text-[#8A9BB5] uppercase tracking-widest">Clients assignés</p>
        {!editing && (
          <button onClick={startEdit} className="text-[11px] font-semibold text-[#4CAF4F] hover:underline">Modifier</button>
        )}
      </div>

      {loading ? (
        <p className="text-[12px] text-[#8A9BB5]">Chargement…</p>
      ) : !editing ? (
        ownedClients.length === 0 ? (
          <p className="text-[12px] text-[#8A9BB5]">Aucun client assigné.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {ownedClients.map((c) => (
              <span key={c.id} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-[#E2E8F0] text-[#374151]">
                {c.company ?? c.name}
              </span>
            ))}
          </div>
        )
      ) : (
        <>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un client…"
            className="w-full mb-2 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white"
          />
          <div className="max-h-[220px] overflow-y-auto flex flex-col gap-1 rounded-xl border border-[#E2E8F0] bg-white p-2">
            {filtered.length === 0 ? (
              <p className="text-[12px] text-[#8A9BB5] px-2 py-1">Aucun résultat.</p>
            ) : filtered.map((c) => {
              const checked = selectedIds.includes(c.id);
              const takenByOther = c.assignedToId && c.assignedToId !== userId && !checked;
              return (
                <div key={c.id} onClick={() => toggle(c.id)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: checked ? '#F0FDF4' : 'transparent' }}>
                  <div className="w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center"
                    style={{ background: checked ? '#4CAF4F' : 'white', borderColor: checked ? '#4CAF4F' : '#D1D5DB' }}>
                    {checked && <svg width={8} height={8} viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className="text-[13px] text-[#374151] flex-1">{c.company ?? c.name}</span>
                  {takenByOther && <span className="text-[10px] text-[#F59E0B] font-semibold">déjà assigné ailleurs</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setEditing(false)} disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151]">Annuler</button>
            <button onClick={save} disabled={saving}
              className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold text-white bg-[#4CAF4F] disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
