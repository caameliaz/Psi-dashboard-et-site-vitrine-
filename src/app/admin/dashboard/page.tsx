'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { orderToDetail, quoteToDetail, DB_TO_UI } from '@/lib/request-detail';
import { useSSE } from '@/lib/use-sse';
import dynamic from 'next/dynamic';
import type { Order, Quote } from '@/types';
import { notifBell } from '@/lib/notif-bell-store';
import { exportDashboardExcel } from '@/lib/export-dashboard';
import { useRole } from '@/lib/role-context';
import { useSession } from 'next-auth/react';
import { Modal } from '@/components/ui/Modal';

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

function getSourceLabel(src: string) { return src === 'SITE' ? 'Site web' : 'Manuel'; }
const SOURCE_COLOR: Record<'SITE' | 'OTHER', { bg: string; color: string; border: string }> = {
  SITE:  { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
  OTHER: { bg: '#FFF7ED', color: '#92400E', border: '#FDE68A' },
};

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
      className="flex items-center gap-2 h-10 pl-2.5 pr-3 rounded-full bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors shadow-sm"
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
          stroke="#717171" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {unread > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#3B82F6] flex items-center justify-center">
          <span className="text-[10px] font-bold text-white leading-none">{unread > 99 ? '99+' : unread}</span>
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
  const [stats, setStats]       = useState({ commandes: 0, devisMois: 0, ventesMois: 0, ventesPrevMois: 0, evolutionVentes: 0, evolutionDevis: 0, devis: 0, clients: 0, livrees: 0 });
  const [moisTab, setMoisTab]   = useState<'commandes' | 'devis'>('commandes');
  const { isAdmin } = useRole();
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const myName = (session?.user as { name?: string } | undefined)?.name ?? 'Moi';
  const [parCommercial, setParCommercial] = useState<{ id: string; name: string; ventes: number; commandes: number; devis: number }[]>([]);
  const [employesLivres, setEmployesLivres] = useState<{ name: string; commandes: number; devis: number; total: number }[]>([]);
  const [objectifs, setObjectifs] = useState<{ global: number; byUser: Record<string, number> }>({ global: 0, byUser: {} });
  const [selectedCommercial, setSelectedCommercial] = useState<string>(''); // '' = total entreprise
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [todayStats, setTodayStats] = useState({ commandes: 0, attente: 0, confirmes: 0 });
  const [topProduits, setTopProduits] = useState<{ ref: string; qty: number; label: string; color: string }[]>([]);
  const [sourceStats, setSourceStats] = useState({ site: 0, manuel: 0 });
  const [evolution, setEvolution] = useState(0);
  const [topWilayas, setTopWilayas] = useState<{ wilaya: string; count: number }[]>([]);
  const [serie6Mois, setSerie6Mois] = useState<{ mois: string; commandes: number; devis: number }[]>([]);
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
      setTopWilayas(data.topWilayas ?? []);
      setSerie6Mois(data.serie6Mois ?? []);
      setParCommercial(data.parCommercial ?? []);
      setEmployesLivres(data.employesLivres ?? []);
      setObjectifs(data.objectifs ?? { global: 0, byUser: {} });
      setTopProduits(
        (data.topProduits as { ref: string; qty: number; label: string }[]).map((p, i) => ({
          ...p, color: TOP_COLORS[i] ?? '#8A9BB5',
        }))
      );
      const allDetails = [
        ...(data.recentOrders as Order[]).map((o) => orderToDetail(o)),
        ...(data.recentQuotes as Quote[]).map((q) => quoteToDetail(q)),
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
  // Filet de sécurité : rafraîchit les stats toutes les 15s en silence (marche même si le SSE ne pousse pas)
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(id);
  }, [fetchData]);

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
          <button
            onClick={() => exportDashboardExcel({ stats, todayStats, sourceStats, evolution, topProduits, topWilayas, serie6Mois, parCommercial, employesLivres, objectifs })}
            title="Exporter le tableau de bord en Excel"
            className="hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#16A34A] hover:bg-[#F8FAFC] transition-colors shadow-sm"
          >
            <svg width={15} height={15} fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M9 13l6 6M15 13l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Exporter
          </button>
          {isAdmin && (
            <button
              onClick={() => setGoalsOpen(true)}
              title="Définir les objectifs du mois"
              className="hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#4CAF4F] hover:bg-[#F8FAFC] transition-colors shadow-sm"
            >
              <svg width={15} height={15} fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>
              Objectifs
            </button>
          )}
        </div>
      </div>

      {/* 3 colonnes égales : post-it | camembert | source */}
      <div className="grid grid-cols-3 gap-6" style={{ alignItems: 'stretch' }}>

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
                  { label: 'Commandes aujourd’hui', value: todayStats.commandes, dot: '#4CAF4F' },
                  { label: 'À traiter (en attente)',      value: todayStats.attente,   dot: '#FBC02D' },
                  { label: 'Confirmés',                   value: todayStats.confirmes, dot: '#2184F3' },
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

      {/* ── Cartes du mois : toggle Commandes/Devis + Ventes ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Carte 1 : toggle Commandes ce mois / Devis ce mois */}
        <div className="bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm">
          <div className="flex items-center gap-1 mb-3 bg-[#F2F4F7] rounded-lg p-0.5 w-fit">
            <button onClick={() => setMoisTab('commandes')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${moisTab === 'commandes' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5] hover:text-[#374151]'}`}>
              Commandes ce mois
            </button>
            <button onClick={() => setMoisTab('devis')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors ${moisTab === 'devis' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5] hover:text-[#374151]'}`}>
              Devis ce mois
            </button>
          </div>
          {moisTab === 'commandes' ? (
            <>
              <div className="flex items-end gap-3">
                <span className="text-[32px] font-extrabold text-[#0F172A] leading-none">{stats.commandes}</span>
                <span className={`flex items-center gap-1 text-[13px] font-bold pb-1 ${evolution >= 0 ? 'text-[#4CAF4F]' : 'text-[#EF4444]'}`}>
                  {evolution >= 0 ? '▲' : '▼'} {Math.abs(evolution)}%
                </span>
              </div>
              <p className="text-[12px] text-[#8A9BB5] mt-1">vs mois précédent</p>
            </>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <span className="text-[32px] font-extrabold text-[#8B5CF6] leading-none">{stats.devisMois}</span>
                <span className={`flex items-center gap-1 text-[13px] font-bold pb-1 ${stats.evolutionDevis >= 0 ? 'text-[#4CAF4F]' : 'text-[#EF4444]'}`}>
                  {stats.evolutionDevis >= 0 ? '▲' : '▼'} {Math.abs(stats.evolutionDevis)}%
                </span>
              </div>
              <p className="text-[12px] text-[#8A9BB5] mt-1">devis créés · vs mois précédent</p>
            </>
          )}
        </div>

        {/* Carte 2 : Ventes ce mois (avec sélecteur commercial pour admin + objectif) */}
        {(() => {
          // Montant + objectif affichés selon la sélection (admin) ou soi-même (employé)
          const activeId = isAdmin ? selectedCommercial : (myId ?? '');
          const isTotal = isAdmin && selectedCommercial === '';
          const ventes = isTotal
            ? stats.ventesMois
            : (parCommercial.find((c) => c.id === activeId)?.ventes ?? 0);
          const objectif = isTotal ? objectifs.global : (activeId ? (objectifs.byUser[activeId] ?? 0) : 0);
          const pct = objectif > 0 ? Math.min(100, Math.round((ventes / objectif) * 100)) : 0;
          const atteint = objectif > 0 && ventes >= objectif;
          return (
            <div className="bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">Ventes ce mois</p>
                {isAdmin && (
                  <div className="relative max-w-[58%]">
                    <select value={selectedCommercial} onChange={(e) => setSelectedCommercial(e.target.value)}
                      className="w-full appearance-none text-[11px] font-bold text-[#374151] border border-[#E2E8F0] rounded-lg pl-2.5 pr-7 py-1.5 bg-white cursor-pointer focus:outline-none focus:border-[#4CAF4F] focus:ring-2 focus:ring-[#4CAF4F]/25 transition-all">
                      <option value="">Toute l&apos;entreprise</option>
                      {myId && <option value={myId}>Mes ventes</option>}
                      {parCommercial.filter((c) => c.id !== myId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A9BB5]" width={12} height={12} viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                <span className="text-[32px] font-extrabold text-[#4CAF4F] leading-none">{Number(ventes).toLocaleString('fr-FR')}</span>
                <span className="text-[15px] font-bold text-[#4CAF4F] pb-1">DA</span>
                {isTotal && (
                  <span className={`flex items-center gap-1 text-[13px] font-bold pb-1 ml-1 ${stats.evolutionVentes >= 0 ? 'text-[#4CAF4F]' : 'text-[#EF4444]'}`}>
                    {stats.evolutionVentes >= 0 ? '▲' : '▼'} {Math.abs(stats.evolutionVentes)}%
                  </span>
                )}
              </div>
              {objectif > 0 ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-wide">Objectif : {Number(objectif).toLocaleString('fr-FR')} DA</span>
                    <span className={`text-[11px] font-bold ${atteint ? 'text-[#16A34A]' : 'text-[#8A9BB5]'}`}>
                      {atteint ? '✓ Atteint' : `${pct}%`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: atteint ? '#16A34A' : '#4CAF4F' }} />
                  </div>
                </div>
              ) : (
                <p className="text-[12px] text-[#8A9BB5] mt-1">commandes + devis livrés {isTotal ? 'ce mois' : 'gérés'}</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Ligne : graphiques barres wilaya + courbe 6 mois */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <WilayaBarChart data={topWilayas} />
        <TrendLineChart data={serie6Mois} />
      </div>

      {/* Tableau dernières demandes */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm mt-8">
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
          onReassigned={() => { setSelectedRequest(null); fetchData(true); }}
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

      {goalsOpen && (
        <GoalsModal
          objectifs={objectifs}
          onClose={() => setGoalsOpen(false)}
          onSaved={() => { setGoalsOpen(false); fetchData(true); }}
        />
      )}
    </div>
  );
}

// ── Modale Objectifs (admin) : objectif global + un objectif par employé ──────
function GoalsModal({ objectifs, onClose, onSaved }: {
  objectifs: { global: number; byUser: Record<string, number> };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [global, setGlobal] = useState(objectifs.global ? String(objectifs.global) : '');
  const [byUser, setByUser] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(objectifs.byUser).map(([k, v]) => [k, String(v)]))
  );
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/users?assignable=true').then((r) => r.ok ? r.json() : []).then((data: { id: string; name: string }[]) =>
      setUsers(data.map((u) => ({ id: u.id, name: u.name })))
    ).catch(() => {});
  }, []);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const byUserNum: Record<string, number> = {};
      Object.entries(byUser).forEach(([k, v]) => { byUserNum[k] = Number(v) || 0; });
      const res = await fetch('/api/goals', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global: Number(global) || 0, byUser: byUserNum }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error ?? 'Échec'); return; }
      onSaved();
    } finally { setSaving(false); }
  };

  const inp = 'w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4CAF4F]/30';

  return (
    <Modal title="Objectifs du mois (DA)" onClose={onClose}>
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-[12px] font-bold text-[#374151] mb-1.5">Objectif général (entreprise)</label>
          <input value={global} onChange={(e) => setGlobal(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="ex: 3000000" className={inp} />
        </div>
        <div>
          <p className="text-[12px] font-bold text-[#374151] mb-2">Objectifs par employé <span className="font-normal text-[#8A9BB5]">(facultatif)</span></p>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <span className="text-[13px] text-[#374151] w-36 truncate">{u.name}</span>
                <input value={byUser[u.id] ?? ''} onChange={(e) => setByUser((p) => ({ ...p, [u.id]: e.target.value.replace(/[^\d]/g, '') }))}
                  inputMode="numeric" placeholder="—" className={inp + ' flex-1'} />
              </div>
            ))}
            {users.length === 0 && <p className="text-[12px] text-[#8A9BB5]">Chargement des employés…</p>}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">Annuler</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] disabled:opacity-60">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </Modal>
  );
}
