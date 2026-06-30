'use client';

import { useState, useEffect, useCallback } from 'react';
import { initials } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { AdminSelect } from '@/components/ui/AdminSelect';

type ActionType = 'commande' | 'devis' | 'produit' | 'client' | 'utilisateur' | 'contenu';

interface HistoryEntry {
  id: number;
  user: string;
  userRole: 'Admin' | 'Employe';
  action: string;
  type: ActionType;
  detail: string;
  date: string;
  heure: string;
  request?: RequestDetail;
}

function dbActionType(entity: string): ActionType {
  const e = (entity ?? '').toUpperCase();
  if (e === 'ORDER')   return 'commande';
  if (e === 'QUOTE')   return 'devis';
  if (e === 'PRODUCT') return 'produit';
  if (e === 'CLIENT')  return 'client';
  if (e === 'USER')    return 'utilisateur';
  return 'contenu';
}

function dbLogToEntry(log: any): HistoryEntry {
  const dt = new Date(log.createdAt);
  return {
    id: log.id,
    user: log.user?.name ?? '—',
    userRole: log.user?.role === 'ADMIN' ? 'Admin' : 'Employe',
    action: log.action ?? '—',
    type: dbActionType(log.entity),
    detail: log.detail ?? log.entityId ?? '',
    date: dt.toLocaleDateString('fr-FR'),
    heure: dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

const typeConfig: Record<ActionType, { label: string; dot: string; bg: string; text: string }> = {
  commande:    { label: 'Commande',    dot: '#4CAF4F', bg: '#F0FDF4', text: '#166534' },
  devis:       { label: 'Devis',       dot: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6' },
  produit:     { label: 'Produit',     dot: '#3B82F6', bg: '#EFF6FF', text: '#1E40AF' },
  client:      { label: 'Client',      dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  utilisateur: { label: 'Utilisateur', dot: '#8B5CF6', bg: '#F3E8FF', text: '#6B21A8' },
  contenu:     { label: 'Contenu',     dot: '#6B7280', bg: '#F9FAFB', text: '#374151' },
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterType, setFilterType] = useState<ActionType | 'all'>('all');
  const [filterUser, setFilterUser] = useState('all');
  const [selected, setSelected] = useState<RequestDetail | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit?limit=100');
      if (res.ok) {
        const data = await res.json();
        setHistory((data.logs ?? data).map(dbLogToEntry));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const users = Array.from(new Set(history.map((h) => h.user)));

  const filtered = history.filter((h) => {
    const matchSearch = !search || h.action.toLowerCase().includes(search.toLowerCase()) || h.detail.toLowerCase().includes(search.toLowerCase()) || h.user.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || h.type === filterType;
    const matchUser = filterUser === 'all' || h.user === filterUser;
    return matchSearch && matchType && matchUser;
  });

  // Grouper par date
  const byDate = filtered.reduce<Record<string, HistoryEntry[]>>((acc, h) => {
    if (!acc[h.date]) acc[h.date] = [];
    acc[h.date].push(h);
    return acc;
  }, {});

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Historique</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-0.5">Toutes les actions effectuées sur la plateforme</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="px-3 py-2 pl-8 w-[200px] rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors" />
        </div>
        <AdminSelect
          value={filterType}
          onChange={(v) => setFilterType(v as ActionType | 'all')}
          options={[{ value: 'all', label: 'Tous les types' }, ...(Object.keys(typeConfig) as ActionType[]).map((t) => ({ value: t, label: typeConfig[t].label }))]}
        />
        <AdminSelect
          value={filterUser}
          onChange={setFilterUser}
          options={[{ value: 'all', label: 'Tous les utilisateurs' }, ...users.map((u) => ({ value: u, label: u }))]}
        />
        {(search || filterType !== 'all' || filterUser !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterType('all'); setFilterUser('all'); }} className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151]">Effacer</button>
        )}
        <span className="ml-auto text-[12px] text-[#8A9BB5]">{loading ? 'Chargement…' : `${filtered.length} résultat${filtered.length !== 1 ? 's' : ''}`}</span>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A9BB5]">
          <p className="text-[15px] font-semibold">Aucune action trouvée</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(byDate).map(([date, entries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-[#E2E8F0]" />
                <span className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest px-2">{date}</span>
                <div className="h-px flex-1 bg-[#E2E8F0]" />
              </div>

              {/* Entrées */}
              <div className="relative pl-6">
                {/* Ligne verticale */}
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-[#E2E8F0]" />

                <div className="flex flex-col gap-4">
                  {entries.map((h) => {
                    const tc = typeConfig[h.type];
                    const isAdmin = h.userRole === 'Admin';
                    const clickable = !!h.request;
                    return (
                      <div
                        key={h.id}
                        onClick={() => h.request && setSelected(h.request)}
                        className={`relative flex items-start gap-4 bg-white border rounded-xl p-4 transition-all ${
                          clickable
                            ? 'border-[#E2E8F0] hover:border-[#4CAF4F] hover:shadow-md cursor-pointer'
                            : 'border-[#F2F4F7]'
                        }`}
                      >
                        {/* Dot sur la ligne */}
                        <div className="absolute -left-[22px] top-5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0" style={{ background: tc.dot }} />

                        {/* Avatar user */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: isAdmin ? '#F3E8FF' : '#D1FAE5', color: isAdmin ? '#6B21A8' : '#166534' }}>
                          {initials(h.user)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-bold text-[#0F172A]">{h.action}</p>
                              <p className="text-[13px] text-[#374151] mt-0.5 font-medium">{h.detail}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: tc.bg, color: tc.text }}>{tc.label}</span>
                              <span className="text-[12px] text-[#8A9BB5] font-mono">{h.heure}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#F2F4F7]">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: isAdmin ? '#F3E8FF' : '#D1FAE5', color: isAdmin ? '#6B21A8' : '#166534' }}>
                                {initials(h.user).charAt(0)}
                              </div>
                              <p className="text-[12px] font-semibold text-[#374151]">{h.user}</p>
                              <span className="text-[11px] text-[#ABBED1]">·</span>
                              <p className="text-[12px] text-[#8A9BB5]">{h.userRole === 'Admin' ? 'Admin' : 'Employé'}</p>
                            </div>
                            {clickable && <span className="ml-auto text-[11px] text-[#4CAF4F] font-semibold">Voir détail →</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <RequestPanel item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
