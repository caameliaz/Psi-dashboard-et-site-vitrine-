'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatusPill } from '@/components/ui/StatusPill';
import { RequestPanel, type RequestDetail } from '@/components/ui/RequestPanel';
import { exportTableauExcel } from '@/lib/export-tableau';
import { useSSE } from '@/lib/use-sse';

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

const TOP_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6'];

const SOURCE_CONFIG = [
  { key: 'site',      label: 'Site web',    color: '#0D9488', icon: '🌐' },
  { key: 'admin',     label: 'Manuel',      color: '#3B82F6', icon: '✏️' },
  { key: 'whatsapp',  label: 'WhatsApp',    color: '#25D366', icon: '💬' },
  { key: 'telephone', label: 'Téléphone',   color: '#F59E0B', icon: '📞' },
  { key: 'autre',     label: 'Autre',       color: '#8A9BB5', icon: '•'  },
] as const;

function SourceChart({ stats }: { stats: Record<string, number> }) {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const items = SOURCE_CONFIG.map(s => ({
    ...s,
    count: stats[s.key] ?? 0,
    pct: total > 0 ? Math.round(((stats[s.key] ?? 0) / total) * 100) : 0,
  })).filter(s => s.count > 0);

  if (total === 0) return <p className="text-[12px] text-[#ABBED1]">Aucune donnée</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* Barre empilée */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {items.map(s => (
          <div key={s.key} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} : ${s.count}`} />
        ))}
      </div>
      {/* Légende */}
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

function PieChart({ data }: { data: { ref: string; qty: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.qty, 0);
  if (total === 0) return <p className="text-[12px] text-[#8A9BB5] py-4">Aucune commande</p>;
  const r = 52, cx = 64, cy = 64, gap = 0.06;
  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sweep = (d.qty / total) * (2 * Math.PI) * (1 - gap * data.length / (2 * Math.PI));
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep + gap;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, pct: Math.round((d.qty / total) * 100) };
  });
  return (
    <div className="flex items-center gap-5">
      <svg width="128" height="128" viewBox="0 0 128 128">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
        <circle cx={cx} cy={cy} r={36} fill="white" />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F172A">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="#8A9BB5">roul.</text>
      </svg>
      <div className="flex flex-col gap-2.5 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[12px] font-bold text-[#374151] font-mono truncate">{s.ref}</span>
            </div>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: s.color }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
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
  const [sourceStats, setSourceStats] = useState({ site: 0, admin: 0, whatsapp: 0, telephone: 0, autre: 0 });
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
        .slice(0, 3)
        .map(([ref, qty], i) => ({ ref, qty, color: TOP_COLORS[i] ?? '#8A9BB5' }));
      setTopProduits(sorted);

      // Source des commandes
      const src = { site: 0, admin: 0, whatsapp: 0, telephone: 0, autre: 0 };
      [...orders, ...quotes].forEach((o: any) => {
        const s = (o.source ?? 'SITE').toLowerCase();
        if (s === 'site') src.site++;
        else if (s === 'admin') src.admin++;
        else if (s === 'whatsapp') src.whatsapp++;
        else if (s === 'telephone') src.telephone++;
        else src.autre++;
      });
      setSourceStats(src);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useSSE(useCallback(() => { fetchData(); }, [fetchData]));

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

  return (
    <div className="w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-[#0F172A] leading-tight">{greeting}</h1>
        <p className="text-[13px] text-[#8A9BB5] mt-1 capitalize">{today} <span className="font-bold text-[#4CAF4F]">{clock}</span></p>
      </div>

      {/* 3 colonnes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8 items-stretch">

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
          ) : (
            <PieChart data={topProduits} />
          )}
        </div>

        {/* Sources des demandes */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-[#8A9BB5] uppercase tracking-widest mb-1">Origine</p>
          <p className="text-[13px] font-semibold text-[#0F172A] mb-5">Source des demandes</p>
          {loading ? (
            <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>
          ) : (
            <SourceChart stats={sourceStats} />
          )}
        </div>

      </div>

      {/* Tableau dernières demandes */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F2F4F7]">
          <h2 className="text-[15px] font-bold text-[#0F172A]">Dernières demandes</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportTableauExcel(sorted, 'PSI_Demandes', 'Demandes')}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151] transition-colors">
              <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.8"/><path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Excel
            </button>
            <a href="/admin/requests" className="text-[12px] font-semibold text-[#4CAF4F] hover:text-[#388E3C] transition-colors">Voir tout ↗</a>
          </div>
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

      {selectedRequest && (
        <RequestPanel
          item={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={(_ref, _statut) => { setSelectedRequest(null); fetchData(); }}
        />
      )}
    </div>
  );
}
