'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { useSSE } from '@/lib/use-sse';
import dynamic from 'next/dynamic';
import type { Order, Quote } from '@/types';
import { notifBell } from '@/lib/notif-bell-store';

// Graphiques Recharts chargés à la demande (ssr:false) → aucun poids ailleurs
const WilayaBarChart = dynamic(() => import('@/components/ui/DashboardCharts').then((m) => m.WilayaBarChart), {
  ssr: false, loading: () => <ChartSkeleton title="Commandes par wilaya" />,
});
const TrendLineChart = dynamic(() => import('@/components/ui/DashboardCharts').then((m) => m.TrendLineChart), {
  ssr: false, loading: () => <ChartSkeleton title="Évolution sur 6 mois" />,
});

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm">
      <h3 className="text-[14px] font-bold text-[#0F172A] mb-3">{title}</h3>
      <div className="h-[200px] flex items-center justify-center text-[12px] text-[#ABBED1]">Chargement du graphique…</div>
    </div>
  );
}

const DB_TO_UI: Record<string, string> = {
  EN_ATTENTE: 'En attente', CONTACTE: 'En attente',
  VALIDE: 'Confirmé', LIVRE: 'Livré', ANNULE: 'Annulé',
};

function getSourceLabel(src: string) { return src === 'SITE' ? 'Site web' : 'Manuel'; }
const SOURCE_COLOR: Record<'SITE' | 'OTHER', { bg: string; color: string; border: string }> = {
  SITE:  { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  OTHER: { bg: '#FFF7ED', color: '#92400E', border: '#FDE68A' },
};

function orderToDetail(o: Order): RequestDetail {
  const phone = o.client?.phones?.find((p) => p.primary)?.number ?? o.client?.phones?.[0]?.number ?? '';
  const produits = o.items?.map((i) => `${i.product?.reference ?? 'Produit supprimé'} × ${i.quantity}`).join(', ') || '—';
  const total = o.items?.reduce((acc, i) => acc + i.quantity * (i.unitPrice ?? 0), 0) ?? 0;
  return {
    id: o.id,
    ref: o.ref ?? o.id?.slice(0, 8).toUpperCase(),
    type: 'Commande',
    source: o.source ?? 'SITE',
    client: o.client?.name ?? o.clientName ?? '—',
    entreprise: o.client?.company ?? o.client?.name ?? o.clientCompany ?? o.clientName ?? '—',
    telephone: phone,
    wilaya: o.client?.wilaya ?? o.clientWilaya ?? '',
    email: o.client?.email ?? '',
    produits,
    montant: total > 0 ? `${total.toLocaleString('fr-FR')} DA` : '—',
    statut: DB_TO_UI[o.status] ?? o.status,
    date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(o.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function quoteToDetail(q: Quote): RequestDetail {
  const phone = q.client?.phones?.find((p) => p.primary)?.number ?? q.client?.phones?.[0]?.number ?? '';
  const produits = q.items?.map((i) => `${i.product?.reference ?? i.description ?? 'Produit supprimé'} × ${i.quantity}`).join(', ') || '—';
  return {
    id: q.id,
    ref: q.ref ?? q.id?.slice(0, 8).toUpperCase(),
    type: 'Devis',
    source: q.source ?? 'SITE',
    client: q.client?.name ?? q.clientName ?? '—',
    entreprise: q.client?.company ?? q.client?.name ?? q.clientCompany ?? q.clientName ?? '—',
    telephone: phone,
    wilaya: q.client?.wilaya ?? q.clientWilaya ?? '',
    email: q.client?.email ?? '',
    produits,
    items: q.items?.map((i) => ({ designation: i.product?.reference ?? i.description ?? 'Produit supprimé', quantite: i.quantity, prixUnitaire: 0 })) ?? [],
    montant: q.proposedPrice ? `${Number(q.proposedPrice).toLocaleString('fr-FR')} DA` : 'Sur devis',
    statut: DB_TO_UI[q.status] ?? q.status,
    date: new Date(q.createdAt).toLocaleDateString('fr-FR'),
    heure: new Date(q.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    message: q.message ?? '',
  };
}

// Palette diagrammes — sobre & pro, sans vert ni bleu : violet grisé, ambre, terracotta, ardoise, taupe, mauve
const TOP_COLORS = ['#7C6BAF', '#E0A458', '#C97B63', '#5E6B7A', '#B0A38F', '#8A6FA8'];

function SourceChart({ stats }: { stats: { site: number; manuel: number } }) {
  const total = (stats.site ?? 0) + (stats.manuel ?? 0);
  if (total === 0) return <p className="text-[12px] text-[#ABBED1]">Aucune donnée</p>;
  const items = [
    { key: 'site',   label: 'Site web', color: '#7C6BAF', count: stats.site ?? 0 },
    { key: 'manuel', label: 'Manuel',   color: '#E0A458', count: stats.manuel ?? 0 },
  ].filter(s => s.count > 0).map(s => ({ ...s, pct: Math.round((s.count / total) * 100) }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {items.map(s => (
          <div key={s.key} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} : ${s.count}`} />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map(s => (
          <div key={s.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[12px] font-semibold text-[#374151]">{s.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold tabular-nums" style={{ color: s.color }}>{s.count}</span>
              <span className="text-[10px] text-[#ABBED1] w-8 text-right">{s.pct}%</span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[#ABBED1] pt-1 border-t border-[#F2F4F7]">Total : {total} demandes</p>
    </div>
  );
}

function PieChart({ data }: { data: { ref: string; qty: number; label: string; color: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const total = data.reduce((s, d) => s + d.qty, 0);
  if (total === 0) return <p className="text-[12px] text-[#8A9BB5] py-4">Aucune commande</p>;
  const R = 70, stroke = 24, cx = 88, cy = 88, gap = 0.015;
  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sweep = (d.qty / total) * (2 * Math.PI) - gap;
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += sweep + gap;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2}`, pct: Math.round((d.qty / total) * 100) };
  });
  const hov = hovered !== null ? slices[hovered] : null;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="relative flex items-center gap-8" onMouseMove={handleMove}>
      <svg width="176" height="176" viewBox="0 0 176 176">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={stroke} strokeLinecap="butt"
            opacity={hovered === null || hovered === i ? 1 : 0.25}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} />
        ))}
      </svg>

      {/* Légende à droite — puce ronde + libellé, empilés */}
      <div className="flex flex-col gap-4">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2.5 cursor-pointer"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
            style={{ opacity: hovered === null || hovered === i ? 1 : 0.4, transition: 'opacity 0.15s' }}>
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-[13px] text-[#374151] whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Carte blanche flottante qui suit la souris au survol d'un segment */}
      {hov && (
        <div className="absolute z-10 pointer-events-none bg-white rounded-xl shadow-2xl border border-[#F2F4F7] px-4 py-3"
          style={{ left: mousePos.x + 14, top: mousePos.y + 14, minWidth: 130 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: hov.color }} />
            <p className="text-[12px] font-bold text-[#0F172A] truncate">{hov.label}</p>
          </div>
          <p className="text-[18px] font-extrabold leading-none" style={{ color: hov.color }}>{hov.pct}%</p>
          <p className="text-[10px] text-[#8A9BB5] mt-1">{hov.qty} unités</p>
        </div>
      )}
    </div>
  );
}

function TypeChip({ type }: { type: string }) {
  const isCommande = type === 'Commande';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: isCommande ? '#F0FDF4' : '#F5F3FF', color: isCommande ? '#166534' : '#5B21B6' }}>
      {type}
    </span>
  );
}

type SortKey = 'client' | 'date' | 'statut' | null;

function BellButton() {
  const [unread, setUnread] = useState(() => notifBell.getCount());
  useEffect(() => notifBell.subscribe(setUnread), []);
  return (
    <button
      onClick={() => notifBell.open()}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-sm"
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
          stroke="#717171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#3B82F6] border-2 border-white flex items-center justify-center">
          <span className="text-[10px] font-bold text-white leading-none px-0.5">{unread > 99 ? '99+' : unread}</span>
        </span>
      )}
    </button>
  );
}

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Bonjour');
  const [today, setToday]   = useState('');
  const [todayShort, setTodayShort] = useState('');
  const [clock, setClock]   = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestDetail | null>(null);
  const [search, setSearch] = useState('');

  const [recentRequests, setRecentRequests] = useState<RequestDetail[]>([]);
  const [stats, setStats]       = useState({ commandes: 0, devis: 0, clients: 0, livrees: 0 });
  const [todayStats, setTodayStats] = useState({ commandes: 0, attente: 0, contactes: 0 });
  const [topProduits, setTopProduits] = useState<{ ref: string; qty: number; label: string; color: string }[]>([]);
  const [sourceStats, setSourceStats] = useState({ site: 0, manuel: 0 });
  const [evolution, setEvolution] = useState(0);
  const [devisEnAttente, setDevisEnAttente] = useState({ count: 0, montant: 0 });
  const [topWilayas, setTopWilayas] = useState<{ wilaya: string; count: number }[]>([]);
  const [serie6Mois, setSerie6Mois] = useState<{ mois: string; commandes: number; devis: number }[]>([]);
  const [employesActifs, setEmployesActifs] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setGreeting(now.getHours() < 18 ? 'Bonjour' : 'Bonsoir');
      setToday(now.toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
      setTodayShort(now.toLocaleDateString('fr-DZ', { weekday: 'long', month: 'long', day: 'numeric' }));
      setClock(now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  // silent = refetch temps réel (SSE) → pas de spinner, mise à jour en douceur
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.stats);
      setTodayStats(data.todayStats);
      setSourceStats(data.sourceStats);
      setEvolution(data.evolutionCommandes ?? 0);
      setDevisEnAttente(data.devisEnAttente ?? { count: 0, montant: 0 });
      setTopWilayas(data.topWilayas ?? []);
      setSerie6Mois(data.serie6Mois ?? []);
      setEmployesActifs(data.employesActifs ?? []);
      setTopProduits(
        (data.topProduits as { ref: string; qty: number; label: string }[]).map((p, i) => ({
          ...p, color: TOP_COLORS[i] ?? '#8A9BB5',
        }))
      );
      const allDetails = [
        ...(data.recentOrders as Order[]).map(orderToDetail),
        ...(data.recentQuotes as Quote[]).map(quoteToDetail),
      ].sort((a, b) => {
        const da = a.date.split('/').reverse().join('') + (a.heure ?? '');
        const db = b.date.split('/').reverse().join('') + (b.heure ?? '');
        return db.localeCompare(da);
      }).slice(0, 5);
      setRecentRequests(allDetails);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useSSE(useCallback(() => { fetchData(true); }, [fetchData]));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...recentRequests]
    .filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return r.client.toLowerCase().includes(q) || r.entreprise.toLowerCase().includes(q) || (r.ref ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (!sortKey) return 0;
      const va = a[sortKey as keyof typeof a] ?? '';
      const vb = b[sortKey as keyof typeof b] ?? '';
      return sortAsc ? (va as string).localeCompare(vb as string) : (vb as string).localeCompare(va as string);
    });

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 inline-block opacity-40 text-[10px]">{sortKey === col ? (sortAsc ? '▲' : '▼') : '⇅'}</span>
  );

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[26px] font-bold text-[#0F172A] leading-tight">{greeting}</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-1 capitalize">{today} <span className="font-bold text-[#4CAF4F]">{clock}</span></p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width={16} height={16} fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke="#ABBED1" strokeWidth="2"/>
              <path d="M20 20l-3-3" stroke="#ABBED1" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] text-[#374151] placeholder-[#ABBED1] focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/30 focus:border-[#4CAF4F] transition-colors shadow-sm"
              style={{ width: 220 }}
            />
          </div>
          <BellButton />
        </div>
      </div>

      {/* 3 colonnes égales : post-it | camembert | source */}
      <div className="grid grid-cols-3 gap-5 mb-8" style={{ alignItems: 'stretch' }}>

        {/* Post-it — stats mois + aujourd'hui */}
        <div className="relative pt-8 px-5 pb-5 flex flex-col"
          style={{
            background: '#FFFDE7',
            boxShadow: '0 10px 22px -10px rgba(120,100,0,0.3), 0 2px 6px rgba(0,0,0,0.05)',
            borderRadius: 18,
          }}>
          {/* Languette jaune en haut, façon onglet de post-it collé */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2/3"
            style={{ width: 88, height: 22, background: '#FDE047', borderRadius: 6 }} />

          <p className="text-[11px] font-bold text-[#B45309] uppercase tracking-widest mb-1">Aujourd&apos;hui</p>
          <p className="text-[15px] font-extrabold text-[#0F172A] mb-4 capitalize">{todayShort}</p>

          {loading ? <p className="text-[12px] text-[#8D6E00]">Chargement…</p> : (
            <>
              <ul className="space-y-3 mb-4">
                {[
                  { label: 'Nouvelles demandes',    value: todayStats.commandes, dot: '#4CAF4F' },
                  { label: 'En attente de réponse', value: todayStats.attente,   dot: '#FBC02D' },
                  { label: 'Clients contactés',     value: todayStats.contactes, dot: '#2184F3' },
                ].map((it) => (
                  <li key={it.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] text-[#374151]">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: it.dot }} />
                      {it.label}
                    </span>
                    <span className="text-[16px] font-extrabold leading-none text-[#263238]">{it.value}</span>
                  </li>
                ))}
              </ul>
              <hr style={{ borderColor: '#FDE047' }} className="mb-3" />
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#8B5CF6]">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M9 12h6M9 16h6M9 8h2M7 3h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {stats.devis} devis en cours
                </p>
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#4CAF4F]">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M4 16L10 10L14 14L20 6M20 6H14M20 6V12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {stats.livrees} livrées ce mois
                </p>
              </div>
            </>
          )}
        </div>

        {/* Camembert — centré, sans infos larges à droite */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-1 self-start">Top produits</p>
          <p className="text-[13px] font-semibold text-[#0F172A] mb-4 self-start">Par produit</p>
          {loading ? <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p> : <PieChart data={topProduits} />}
        </div>

        {/* Source */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm flex flex-col">
          <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-1">Origine</p>
          <p className="text-[13px] font-semibold text-[#0F172A] mb-4">Source des demandes</p>
          {loading ? <p className="text-[12px] text-[#8A9BB5]">Chargement…</p> : <SourceChart stats={sourceStats} />}
        </div>

      </div>

      {/* ── Nouvelles stats (P2) ──────────────────────────────────────── */}
      {/* Ligne : cartes évolution + devis en attente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-2">Commandes ce mois</p>
          <div className="flex items-end gap-3">
            <span className="text-[32px] font-extrabold text-[#0F172A] leading-none">{stats.commandes}</span>
            <span className={`flex items-center gap-1 text-[13px] font-bold pb-1 ${evolution >= 0 ? 'text-[#4CAF4F]' : 'text-[#EF4444]'}`}>
              {evolution >= 0 ? '▲' : '▼'} {Math.abs(evolution)}%
            </span>
          </div>
          <p className="text-[12px] text-[#8A9BB5] mt-1">vs mois précédent</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-2">Devis en attente</p>
          <div className="flex items-end gap-3">
            <span className="text-[32px] font-extrabold text-[#8B5CF6] leading-none">{devisEnAttente.count}</span>
            <span className="text-[13px] font-bold text-[#8A9BB5] pb-1">
              {devisEnAttente.montant > 0 ? `≈ ${Number(devisEnAttente.montant).toLocaleString('fr-FR')} DA` : '—'}
            </span>
          </div>
          <p className="text-[12px] text-[#8A9BB5] mt-1">montant estimé (prix proposés)</p>
        </div>
      </div>

      {/* Ligne : graphiques barres wilaya + courbe 6 mois */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WilayaBarChart data={topWilayas} />
        <TrendLineChart data={serie6Mois} />
      </div>

      {/* Tableau employés actifs */}
      <div className="bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm">
        <h3 className="text-[14px] font-bold text-[#0F172A] mb-1">Employés actifs ce mois</h3>
        <p className="text-[11px] text-[#8A9BB5] mb-4">Commandes créées manuellement</p>
        {employesActifs.length === 0 ? (
          <p className="text-[12px] text-[#8A9BB5] py-4 text-center">Aucune commande créée manuellement ce mois</p>
        ) : (
          <div className="flex flex-col gap-2">
            {employesActifs.map((e, i) => {
              const max = employesActifs[0]?.count || 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[13px] font-semibold text-[#374151] w-32 truncate">{e.name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-[#F2F4F7] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(e.count / max) * 100}%`, background: '#4CAF4F' }} />
                  </div>
                  <span className="text-[13px] font-bold text-[#0F172A] tabular-nums w-8 text-right">{e.count}</span>
                </div>
              );
            })}
          </div>
        )}
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
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>Source</th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider" style={{ fontSize: 11 }}>Entreprise</th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('client')}>Client <SortIcon col="client" /></th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('date')}>Date <SortIcon col="date" /></th>
              <th className="px-6 py-3.5 text-left font-semibold text-[#8A9BB5] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] transition-colors" style={{ fontSize: 11 }} onClick={() => handleSort('statut')}>Statut <SortIcon col="statut" /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-[13px] text-[#8A9BB5]">Chargement…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-[13px] text-[#8A9BB5]">Aucune demande</td></tr>
            ) : sorted.map((row, i) => {
              const isAttente  = row.statut === 'En attente';
              const rowBg      = isAttente ? '#FFF7ED' : '#fff';
              const rowBgHover = isAttente ? '#FEF3C7' : '#F8FAFC';
              const src        = row.source ?? 'SITE';
              const srcCfg     = src === 'SITE' ? SOURCE_COLOR.SITE : SOURCE_COLOR.OTHER;
              return (
                <tr key={i} onClick={() => setSelectedRequest(row)} className="cursor-pointer transition-colors"
                  style={{ background: rowBg, borderTop: '1px solid #F2F4F7' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = rowBgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}>
                  <td className="px-6 py-4 text-[12px] font-mono font-bold" style={{ color: row.type === 'Commande' ? '#4CAF4F' : '#8B5CF6' }}>{row.ref}</td>
                  <td className="px-6 py-4"><TypeChip type={row.type} /></td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-bold px-2 py-1 rounded-lg border"
                      style={{ background: srcCfg.bg, color: srcCfg.color, borderColor: srcCfg.border }}>
                      {getSourceLabel(src)}
                    </span>
                  </td>
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

      {selectedRequest && (
        <RequestPanel
          item={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={async (_ref, newStatut) => {
            const item = selectedRequest;
            if (!item?.id) return;
            const UI_TO_DB: Record<string, string> = { 'En attente': 'EN_ATTENTE', 'Confirmé': 'VALIDE', 'Livré': 'LIVRE', 'Annulé': 'ANNULE' };
            const endpoint = item.type === 'Devis' ? `/api/quotes/${item.id}` : `/api/orders/${item.id}`;
            await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: UI_TO_DB[newStatut] ?? newStatut }) });
            setSelectedRequest(null);
            fetchData(true);
          }}
          onConfirmQuoteWithPrice={async (item) => {
            if (item.id) {
              // Fixe le prix du devis (proposedPrice) au moment de la confirmation
              const prix = item._prix;
              let proposedPrice = 0;
              if (prix?.totalOverride !== undefined) {
                proposedPrice = prix.totalOverride;
              } else if (prix?.itemPrices) {
                proposedPrice = (item.items ?? []).reduce((acc, it) => {
                  const p = prix.itemPrices!.find((x) => x.designation === it.designation);
                  return acc + it.quantite * (p?.unitPrice ?? 0);
                }, 0);
              }
              await fetch(`/api/quotes/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'VALIDE', proposedPrice }),
              });
            }
            setSelectedRequest(null);
            fetchData(true);
          }}
        />
      )}
    </div>
  );
}
