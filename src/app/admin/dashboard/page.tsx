'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';

const DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente', CONTACTE: 'Contacté',
  VALIDE: 'Confirmé', LIVRE: 'Livré', ANNULE: 'Annulé',
};

function orderToDetail(o: any): RequestDetail {
  const phone = o.client?.phones?.find((p: any) => p.primary)?.number ?? o.client?.phones?.[0]?.number ?? '';
  const produits = o.items?.map((i: any) => `${i.product?.reference ?? '?'} × ${i.quantity}`).join(', ') || '—';
  const total = o.items?.reduce((acc: number, i: any) => acc + i.quantity * (i.unitPrice ?? 0), 0) ?? 0;
  return {
    id: o.id,
    ref: o.ref ?? o.id?.slice(0, 8).toUpperCase(),
    type: 'Commande',
    client: o.client?.name ?? '—',
    entreprise: o.client?.company ?? o.client?.name ?? '—',
    telephone: phone,
    wilaya: o.client?.wilaya ?? '',
    email: o.client?.email ?? '',
    produits,
    montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA` : '—',
    statut: DB_TO_UI[o.status] ?? o.status,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function quoteToDetail(q: any): RequestDetail {
  const phone = q.client?.phones?.find((p: any) => p.primary)?.number ?? q.client?.phones?.[0]?.number ?? '';
  const produits = q.items?.map((i: any) => `${i.product?.reference ?? '?'} × ${i.quantity}`).join(', ') || '—';
  return {
    id: q.id,
    ref: q.ref ?? q.id?.slice(0, 8).toUpperCase(),
    type: 'Devis',
    client: q.client?.name ?? '—',
    entreprise: q.client?.company ?? q.client?.name ?? '—',
    telephone: phone,
    wilaya: q.client?.wilaya ?? '',
    email: q.client?.email ?? '',
    produits,
    montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    statut: DB_TO_UI[q.status] ?? q.status,
    date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(q.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    message: q.message ?? '',
  };
}

const STAT_CONFIG = [
  { key: 'commandes',  label: 'Commandes',        sub: 'ce mois',  color: '#4CAF4F', bg: '#F0FDF4' },
  { key: 'devis',      label: 'Devis',             sub: 'en cours', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'clients',    label: 'Nouveaux clients',  sub: 'ce mois',  color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'livrees',    label: 'Livrées',           sub: 'ce mois',  color: '#8B5CF6', bg: '#F5F3FF' },
];

const TOP_COLORS = ['#4CAF4F', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

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
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `2px solid ${isCommande ? '#4CAF4F' : '#8B5CF6'}`, background: isCommande ? '#F0FDF4' : '#F5F3FF', color: isCommande ? '#166534' : '#5B21B6' }}>
      {type}
    </span>
  );
}

type SortKey = 'client' | 'date' | 'statut' | null;

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Bonjour');
  const [today, setToday]   = useState('');
  const [clock, setClock]   = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetail | null>(null);

  // Data from API
  const [recentRequests, setRecentRequests] = useState<RequestDetail[]>([]);
  const [stats, setStats]       = useState({ commandes: 0, devis: 0, clients: 0, livrees: 0 });
  const [todayStats, setTodayStats] = useState({ commandes: 0, attente: 0, contactes: 0 });
  const [topProduits, setTopProduits] = useState<{ ref: string; qty: number; color: string }[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setGreeting(now.getHours() < 18 ? 'Bonjour' : 'Bonsoir');
      setToday(now.toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
      setClock(now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, quoRes, cliRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/quotes'),
        fetch('/api/clients'),
      ]);

      const orders  = ordRes.ok  ? await ordRes.json()  : [];
      const quotes  = quoRes.ok  ? await quoRes.json()  : [];
      const clients = cliRes.ok  ? await cliRes.json()  : [];

      // Dernières demandes (7 plus récentes, mix commandes + devis)
      const allDetails = [
        ...orders.map(orderToDetail),
        ...quotes.map(quoteToDetail),
      ].sort((a, b) => {
        const da = a.date.split('/').reverse().join('') + (a.heure ?? '');
        const db = b.date.split('/').reverse().join('') + (b.heure ?? '');
        return db.localeCompare(da);
      }).slice(0, 7);
      setRecentRequests(allDetails);

      // Stats ce mois
      const now = new Date();
      const thisMonth = (d: string) => {
        const dt = new Date(d);
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      };
      const today = (d: string) => {
        const dt = new Date(d);
        const n = new Date();
        return dt.toDateString() === n.toDateString();
      };

      const cmdMois    = orders.filter((o: any) => thisMonth(o.createdAt)).length;
      const livrees    = orders.filter((o: any) => o.status === 'LIVRE' && thisMonth(o.createdAt)).length;
      const devisMois  = quotes.filter((q: any) => q.status === 'EN_ATTENTE' || q.status === 'CONTACTE').length;
      const cliMois    = clients.filter((c: any) => thisMonth(c.createdAt)).length;

      setStats({ commandes: cmdMois, devis: devisMois, clients: cliMois, livrees });

      // Stats du jour
      const cmdToday     = orders.filter((o: any) => today(o.createdAt)).length;
      const attenteCount = orders.filter((o: any) => o.status === 'EN_ATTENTE').length
                         + quotes.filter((q: any) => q.status === 'EN_ATTENTE').length;
      const contacteCount = orders.filter((o: any) => o.status === 'CONTACTE').length;
      setTodayStats({ commandes: cmdToday, attente: attenteCount, contactes: contacteCount });

      // Top produits — compter les quantités par référence
      const refCount: Record<string, number> = {};
      orders.forEach((o: any) => {
        (o.items ?? []).forEach((item: any) => {
          const ref = item.product?.reference ?? 'Autre';
          refCount[ref] = (refCount[ref] ?? 0) + item.quantity;
        });
      });
      const sorted = Object.entries(refCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ref, qty], i) => ({ ref, qty, color: TOP_COLORS[i] ?? '#8A9BB5' }));
      setTopProduits(sorted);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...recentRequests].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey as keyof typeof a] ?? '';
    const vb = b[sortKey as keyof typeof b] ?? '';
    return sortAsc ? (va as string).localeCompare(vb as string) : (vb as string).localeCompare(va as string);
  });

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-block opacity-40 text-[10px]">{sortKey === col ? (sortAsc ? '▲' : '▼') : '⇅'}</span>
  );

  const totalTopQty = topProduits[0]?.qty ?? 1;

  return (
    <div className="w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-[#0F172A] leading-tight">{greeting}</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-1 capitalize">{today} <span className="font-bold text-[#4CAF4F]">{clock}</span></p>
      </div>

      {/* 3 colonnes */}
      <div className="grid grid-cols-3 gap-5 mb-8 items-start">

        {/* Post-it — stats du jour */}
        <div className="rounded-xl p-5 shadow-[4px_6px_18px_rgba(0,0,0,0.10)] relative" style={{ background: '#FFFDE7', transform: 'rotate(-1deg)', borderTop: '4px solid #FDD835' }}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 rounded-sm opacity-60" style={{ background: 'rgba(253,216,53,0.5)', backdropFilter: 'blur(2px)', border: '1px solid rgba(253,216,53,0.8)' }} />
          <p className="text-[10px] font-bold text-[#B7791F] uppercase tracking-widest mb-1 mt-2">Aujourd&apos;hui</p>
          <p className="text-[13px] font-bold text-[#0F172A] mb-4 capitalize">{new Date().toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {loading ? (
            <p className="text-[12px] text-[#B7791F]">Chargement…</p>
          ) : (
            <ul className="space-y-3">
              {[
                { label: 'Nouvelles demandes',  value: todayStats.commandes, color: '#4CAF4F' },
                { label: 'En attente de réponse', value: todayStats.attente,   color: '#F59E0B' },
                { label: 'Clients contactés',   value: todayStats.contactes, color: '#3B82F6' },
              ].map((it) => (
                <li key={it.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.color }} />
                    <span className="text-[13px] text-[#374151]">{it.label}</span>
                  </div>
                  <span className="text-[15px] font-extrabold" style={{ color: it.color }}>{it.value}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-[#FDD835]/60 flex items-center gap-1.5">
            <IconTrendUp />
            <span className="text-[12px] font-semibold text-[#4CAF4F]">{stats.livrees} livrées ce mois</span>
          </div>
        </div>

        {/* Stats mois */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest mb-1">Ce mois-ci</p>
          <p className="text-[13px] font-semibold text-[#0F172A] mb-4">
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
          {loading ? (
            <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {STAT_CONFIG.map((s) => (
                <div key={s.key} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: s.bg }}>
                  <span className="text-[22px] font-extrabold leading-none" style={{ color: s.color }}>
                    {stats[s.key as keyof typeof stats]}
                  </span>
                  <span className="text-[12px] font-semibold text-[#0F172A]">{s.label}</span>
                  <span className="text-[11px] text-[#8A9BB5]">{s.sub}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top produits */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest mb-1">Top produits</p>
          <p className="text-[13px] font-semibold text-[#0F172A] mb-5">Références les plus commandées</p>
          {loading ? (
            <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>
          ) : topProduits.length === 0 ? (
            <p className="text-[12px] text-[#8A9BB5] py-4">Aucune commande ce mois</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topProduits.map((p, i) => {
                const pct = Math.round((p.qty / totalTopQty) * 100);
                const rankColors = ['#F59E0B', '#9CA3AF', '#CD7C2F'];
                const medalColor = i < 3 ? rankColors[i] : '#D1D5DB';
                return (
                  <div key={p.ref} className="flex items-center gap-3">
                    <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-extrabold text-white" style={{ background: medalColor }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-bold text-[#374151] font-mono">{p.ref}</span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ color: p.color }}>{p.qty} roul.</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: p.color, opacity: 0.7 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Tableau dernières demandes */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <h2 className="text-[15px] font-bold text-[#0F172A]">Dernières demandes</h2>
          <a href="/admin/requests" className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">Voir tout ↗</a>
        </div>
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>N°</th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>Type</th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>Entreprise</th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('client')}>Client <SortIcon col="client" /></th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('date')}>Date <SortIcon col="date" /></th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('statut')}>Statut <SortIcon col="statut" /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-[13px] text-[#8A9BB5]">Chargement…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-[13px] text-[#8A9BB5]">Aucune demande</td></tr>
            ) : sorted.map((row, i) => {
              const isAttente  = row.statut === 'En attente';
              const rowBg      = isAttente ? '#FFF7ED' : '#fff';
              const rowBgHover = isAttente ? '#FEF3C7' : '#F8FAFC';
              return (
                <tr key={i} onClick={() => setSelectedRequest(row)} className="cursor-pointer transition-colors"
                  style={{ background: rowBg, borderTop: '1px solid #F2F4F7' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = rowBgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                  <td className="px-6 py-4 text-[12px] font-mono font-bold" style={{ color: row.type === 'Commande' ? '#4CAF4F' : '#8B5CF6' }}>{row.ref}</td>
                  <td className="px-6 py-4"><TypeChip type={row.type} /></td>
                  <td className="px-6 py-4 text-[13px] font-semibold text-[#0F172A]">{row.entreprise}</td>
                  <td className="px-6 py-4 text-[13px] text-[#8A9BB5]">{row.client}</td>
                  <td className="px-6 py-4 text-[13px] text-[#8A9BB5] tabular-nums">{row.date}</td>
                  <td className="px-6 py-4"><StatusPill status={row.statut} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRequest && <RequestPanel item={selectedRequest} onClose={() => setSelectedRequest(null)} />}
    </div>
  );
}
