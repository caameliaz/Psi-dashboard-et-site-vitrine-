'use client';

import { useState } from 'react';
import { initials } from '@/lib/utils';

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
}

const historyData: HistoryEntry[] = [
  { id: 1,  user: 'Yacine Rahali',  userRole: 'Admin',   action: 'Commande validee',     type: 'commande',     detail: 'CMD-001 — TechAlger',              date: '28/06/2026', heure: '09:42' },
  { id: 2,  user: 'Amira Bensaid',  userRole: 'Employe', action: 'Statut mis a jour',     type: 'commande',     detail: 'CMD-002 (BuroPro) → Contacte',     date: '28/06/2026', heure: '09:15' },
  { id: 3,  user: 'Yacine Rahali',  userRole: 'Admin',   action: 'Produit modifie',       type: 'produit',      detail: '80/80 — prix modifie',             date: '27/06/2026', heure: '17:30' },
  { id: 4,  user: 'Tariq Meziane',  userRole: 'Employe', action: 'Produit desactive',     type: 'produit',      detail: '44/40 desactive',                  date: '27/06/2026', heure: '16:55' },
  { id: 5,  user: 'Yacine Rahali',  userRole: 'Admin',   action: 'Utilisateur cree',      type: 'utilisateur',  detail: 'Amira Bensaid — Employe',          date: '27/06/2026', heure: '14:20' },
  { id: 6,  user: 'Amira Bensaid',  userRole: 'Employe', action: 'Devis consulte',        type: 'devis',        detail: 'DEV-005 — BuroPro',                date: '27/06/2026', heure: '11:05' },
  { id: 7,  user: 'Yacine Rahali',  userRole: 'Admin',   action: 'Contenu mis a jour',    type: 'contenu',      detail: 'Section Hero — titre modifie',     date: '26/06/2026', heure: '18:00' },
  { id: 8,  user: 'Tariq Meziane',  userRole: 'Employe', action: 'Client consulte',       type: 'client',       detail: 'Fiche PrintPlus ouverte',          date: '26/06/2026', heure: '10:30' },
  { id: 9,  user: 'Yacine Rahali',  userRole: 'Admin',   action: 'Produit supprime',      type: 'produit',      detail: '44/40 supprime definitivement',    date: '25/06/2026', heure: '15:10' },
  { id: 10, user: 'Amira Bensaid',  userRole: 'Employe', action: 'Commande annulee',      type: 'commande',     detail: 'CMD-004 — MegaDist → Annule',      date: '24/06/2026', heure: '09:00' },
];

const typeConfig: Record<ActionType, { label: string; bg: string; text: string }> = {
  commande:     { label: 'Commande',     bg: '#F0FDF4', text: '#166534' },
  devis:        { label: 'Devis',        bg: '#F5F3FF', text: '#5B21B6' },
  produit:      { label: 'Produit',      bg: '#EFF6FF', text: '#1E40AF' },
  client:       { label: 'Client',       bg: '#FFFBEB', text: '#92400E' },
  utilisateur:  { label: 'Utilisateur',  bg: '#F3E8FF', text: '#6B21A8' },
  contenu:      { label: 'Contenu',      bg: '#F0FDF4', text: '#166534' },
};

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ActionType | 'all'>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  const users = Array.from(new Set(historyData.map((h) => h.user)));

  const filtered = historyData.filter((h) => {
    const matchSearch = search === '' ||
      h.action.toLowerCase().includes(search.toLowerCase()) ||
      h.detail.toLowerCase().includes(search.toLowerCase()) ||
      h.user.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || h.type === filterType;
    const matchUser = filterUser === 'all' || h.user === filterUser;
    return matchSearch && matchType && matchUser;
  });

  const inputClass = "px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] bg-white focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors";

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#0F172A]">Historique</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-0.5">Toutes les actions effectuees sur la plateforme</p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className={inputClass + " pl-8 w-[220px]"} />
        </div>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value as ActionType | 'all')} className={inputClass}>
          <option value="all">Tous les types</option>
          {(Object.keys(typeConfig) as ActionType[]).map((t) => (
            <option key={t} value={t}>{typeConfig[t].label}</option>
          ))}
        </select>

        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className={inputClass}>
          <option value="all">Tous les utilisateurs</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>

        {(search || filterType !== 'all' || filterUser !== 'all') && (
          <button onClick={() => { setSearch(''); setFilterType('all'); setFilterUser('all'); }} className="text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151] transition-colors">Effacer les filtres</button>
        )}
        <span className="ml-auto text-[12px] text-[#8A9BB5]">{filtered.length} resultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Utilisateur', 'Action', 'Type', 'Detail', 'Date', 'Heure'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <p className="text-[14px] font-semibold text-[#8A9BB5]">Aucune action trouvee</p>
                  <p className="text-[12px] text-[#ABBED1] mt-1">Modifiez vos filtres pour voir plus de resultats</p>
                </td>
              </tr>
            ) : filtered.map((h) => {
              const tc = typeConfig[h.type];
              const isAdmin = h.userRole === 'Admin';
              return (
                <tr key={h.id} className="border-t border-[#F2F4F7] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: isAdmin ? '#F3E8FF' : '#D1FAE5', color: isAdmin ? '#6B21A8' : '#166534' }}>
                        {initials(h.user)}
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold text-[#0F172A]">{h.user}</p>
                        <p className="text-[10px] text-[#8A9BB5]">{h.userRole === 'Admin' ? 'Admin' : 'Employe'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12px] font-semibold text-[#0F172A]">{h.action}</td>
                  <td className="px-5 py-4">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text }}>{tc.label}</span>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-[#8A9BB5] max-w-[200px] truncate">{h.detail}</td>
                  <td className="px-5 py-4 text-[12px] text-[#8A9BB5] tabular-nums">{h.date}</td>
                  <td className="px-5 py-4 text-[12px] font-mono text-[#4CAF4F]">{h.heure}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
