'use client';

import React, { useState, useEffect } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';

type NotifType = 'site' | 'action' | 'other';
interface Notif { id: number; type: NotifType; title: string; desc: string; time: string; read: boolean; }

const mockNotifs: Notif[] = [
  { id: 1, type: 'site', title: 'Nouvelle commande', desc: 'Ahmed Benali (TechAlger) vient de passer une commande.', time: 'Il y a 5 min', read: false },
  { id: 2, type: 'site', title: 'Nouveau devis', desc: 'Sara Mansouri (BuroPro) demande un devis personnalisé.', time: 'Il y a 18 min', read: false },
  { id: 3, type: 'action', title: 'Produit modifié', desc: 'Vous avez modifié le produit 80/80.', time: 'Il y a 1h', read: true },
  { id: 4, type: 'other', title: 'Amira a validé une commande', desc: 'Commande CMD-002 (PrintPlus) marquée Validée.', time: 'Il y a 2h', read: true },
  { id: 5, type: 'action', title: 'Client ajouté', desc: 'Vous avez ajouté EcoMarket à la base clients.', time: 'Il y a 3h', read: true },
  { id: 6, type: 'other', title: 'Tariq a supprimé un produit', desc: 'Produit 44/40 supprimé par Tariq Meziane.', time: 'Hier', read: true },
];

const notifStyle: Record<NotifType, { dot: string; bg: string; border: string }> = {
  site:   { dot: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  action: { dot: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
  other:  { dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
};

function NotifSlideIn({ notifs, setNotifs, onClose }: { notifs: Notif[]; setNotifs: React.Dispatch<React.SetStateAction<Notif[]>>; onClose: () => void }) {
  const unread = notifs.filter((n) => !n.read).length;

  const markAll = () => setNotifs((p) => p.map((n) => ({ ...n, read: true })));

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-[88px] w-[360px] bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] z-50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-[#0F172A]">Notifications</h3>
            {unread > 0 && <span className="text-[10px] font-bold bg-[#EF4444] text-white px-1.5 py-0.5 rounded-full">{unread}</span>}
          </div>
          {unread > 0 && <button onClick={markAll} className="text-[11px] font-semibold text-[#4CAF4F] hover:text-[#388E3C]">Tout marquer lu</button>}
        </div>

        <div className="flex gap-2 px-5 py-2.5 border-b border-[#E2E8F0] text-[10px] font-bold text-[#8A9BB5]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"/>Site public</span>
          <span className="flex items-center gap-1 ml-3"><span className="w-2 h-2 rounded-full bg-[#9CA3AF]"/>Mes actions</span>
          <span className="flex items-center gap-1 ml-3"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"/>Autres users</span>
        </div>

        <div className="max-h-[420px] overflow-y-auto divide-y divide-[#F2F4F7]">
          {notifs.map((n) => {
            const s = notifStyle[n.type];
            return (
              <div key={n.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#F8FAFC] transition-colors" style={{ background: n.read ? 'transparent' : '#FAFCFF' }}>
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? '#E2E8F0' : s.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-[#0F172A]">{n.title}</p>
                  <p className="text-[11px] text-[#8A9BB5] mt-0.5 leading-relaxed">{n.desc}</p>
                  <p className="text-[10px] text-[#ABBED1] mt-1">{n.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function IconBell({ color = '#717171' }) {
  return (
    <svg width={20} height={20} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1.5C5.96 1.5 3.5 3.96 3.5 7V11.5L1.5 13.5V14.5H16.5V13.5L14.5 11.5V7C14.5 3.96 12.04 1.5 9 1.5Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.5 14.5C6.5 15.88 7.62 17 9 17C10.38 17 11.5 15.88 11.5 14.5" stroke={color} strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width={14} height={14} fill="none" viewBox="0 0 16 16">
      <path d="M2 12L6 8L9 11L14 5" stroke="#4CAF4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 5h4v4" stroke="#4CAF4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TypeChip({ type }: { type: string }) {
  const isCommande = type === 'Commande';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${isCommande ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#F5F3FF] text-[#5B21B6]'}`}>
      {type}
    </span>
  );
}

const recentRequests = [
  { client: 'Ahmed Benali', entreprise: 'TechAlger', type: 'Commande', date: '24/06/2026', statut: 'Validé' },
  { client: 'Sara Mansouri', entreprise: 'BuroPro', type: 'Devis', date: '23/06/2026', statut: 'En attente' },
  { client: 'Karim Hadji', entreprise: 'AlgeroShop', type: 'Commande', date: '22/06/2026', statut: 'Contacté' },
  { client: 'Nadia Berber', entreprise: 'MegaDist', type: 'Commande', date: '21/06/2026', statut: 'Annulé' },
  { client: 'Mohamed Ziani', entreprise: 'PrintPlus', type: 'Devis', date: '20/06/2026', statut: 'Validé' },
  { client: 'Fatima Bouzid', entreprise: 'EcoMarket', type: 'Commande', date: '19/06/2026', statut: 'En attente' },
];

const bentoStats = [
  { label: 'Commandes', value: 47, sub: 'ce mois', color: '#4CAF4F', bg: '#F0FDF4', border: '#BBF7D0', trend: '+12%', up: true },
  { label: 'Devis', value: 18, sub: 'en cours', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', trend: '-3%', up: false },
  { label: 'Nouveaux clients', value: 5, sub: 'ce mois', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', trend: '+2', up: true },
  { label: 'Taux validation', value: '68%', sub: 'vs 60% mai', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE', trend: '+8%', up: true },
];

type SortKey = 'client' | 'date' | 'statut' | null;

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Bonjour');
  const [today, setToday] = useState('');
  const [clock, setClock] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(mockNotifs);
  const unreadCount = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours();
      setGreeting(h < 18 ? 'Bonjour' : 'Bonsoir');
      setToday(now.toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
      setClock(now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...recentRequests].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey as keyof typeof a];
    const vb = b[sortKey as keyof typeof b];
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-block opacity-40 text-[10px]">
      {sortKey === col ? (sortAsc ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[26px] font-bold text-[#0F172A] leading-tight">{greeting}, Yacine</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-1 capitalize">{today} <span className="font-bold text-[#4CAF4F]">{clock}</span></p>
        </div>
        <div className="relative">
          <button onClick={() => setShowNotifs((v) => !v)} className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-sm">
            <IconBell color="#717171" />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3B82F6] border-2 border-white" />}
          </button>
          {showNotifs && <NotifSlideIn notifs={notifs} setNotifs={setNotifs} onClose={() => setShowNotifs(false)} />}
        </div>
      </div>

      {/* Aujourd hui en post-it + Resume mois */}
      <div className="grid grid-cols-[1fr_2fr] gap-5 mb-8 items-start">

        {/* Post-it Aujourd hui */}
        <div
          className="rounded-xl p-5 shadow-[4px_6px_18px_rgba(0,0,0,0.10)] relative"
          style={{
            background: '#FFFDE7',
            transform: 'rotate(-1deg)',
            borderTop: '4px solid #FDD835',
          }}
        >
          {/* Scotch */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 rounded-sm opacity-60" style={{ background: 'rgba(253,216,53,0.5)', backdropFilter: 'blur(2px)', border: '1px solid rgba(253,216,53,0.8)' }} />

          <p className="text-[10px] font-bold text-[#B7791F] uppercase tracking-widest mb-1 mt-2">Aujourd&apos;hui</p>
          <p className="text-[13px] font-bold text-[#0F172A] mb-4 capitalize">{new Date().toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

          <ul className="space-y-3">
            {[
              { label: 'Commandes recues', value: 7, color: '#4CAF4F' },
              { label: 'Devis en attente', value: 3, color: '#F59E0B' },
              { label: 'Clients contactes', value: 5, color: '#3B82F6' },
            ].map((item) => (
              <li key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-[13px] text-[#374151]">{item.label}</span>
                </div>
                <span className="text-[15px] font-extrabold" style={{ color: item.color }}>{item.value}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-3 border-t border-[#FDD835]/60 flex items-center gap-1.5">
            <IconTrendUp />
            <span className="text-[12px] font-semibold text-[#4CAF4F]">+2 commandes vs hier</span>
          </div>
        </div>

        {/* Resume mois — card blanche */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest">Ce mois-ci</p>
              <p className="text-[14px] font-semibold text-[#0F172A] mt-0.5">Juin 2026 <span className="text-[#4CAF4F] font-bold">+12% vs mai</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {bentoStats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: s.bg }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.color + '20', border: `1.5px solid ${s.border}` }}>
                  <span className="text-[13px] font-extrabold" style={{ color: s.color }}>{s.value}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#0F172A]">{s.label}</p>
                  <p className="text-[11px] text-[#8A9BB5]">{s.sub}</p>
                </div>
                <span className="text-[11px] font-bold flex-shrink-0" style={{ color: s.up ? '#22C55E' : '#EF4444' }}>
                  {s.up ? '▲' : '▼'} {s.trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table dernieres demandes */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <h2 className="text-[15px] font-bold text-[#0F172A]">Dernieres demandes</h2>
          <button className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] flex items-center gap-1 transition-colors">
            Voir tout <span className="text-base leading-none">↗</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#0F172A] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('client')}>Client <SortIcon col="client" /></th>
                <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>Entreprise</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>Type</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#0F172A] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('date')}>Date <SortIcon col="date" /></th>
                <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#0F172A] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('statut')}>Statut <SortIcon col="statut" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="text-[14px] font-semibold text-[#8A9BB5]">Aucune demande pour l&apos;instant</p>
                    <p className="text-[12px] text-[#ABBED1] mt-1">Les nouvelles commandes et devis apparaîtront ici</p>
                  </td>
                </tr>
              ) : sorted.map((row, i) => (
                <tr key={i} className="border-t border-[#F2F4F7] hover:bg-[#F8FAFC] transition-colors cursor-pointer">
                  <td className="px-6 py-4 text-[13px] font-semibold text-[#0F172A]">{row.client}</td>
                  <td className="px-6 py-4 text-[13px] text-[#8A9BB5]">{row.entreprise}</td>
                  <td className="px-6 py-4"><TypeChip type={row.type} /></td>
                  <td className="px-6 py-4 text-[13px] text-[#8A9BB5] tabular-nums">{row.date}</td>
                  <td className="px-6 py-4"><StatusPill status={row.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
