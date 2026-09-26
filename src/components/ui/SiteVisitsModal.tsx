'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const CategoryPageViewsChart = dynamic(() => import('@/components/ui/DashboardCharts').then((m) => m.CategoryPageViewsChart), {
  ssr: false,
  loading: () => <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>,
});

type WeeklyViews = { week: string; categories: { category: string; views: number; color: string }[] }[];

interface SiteDetails {
  whatsappClicks: number | null;
  cities: { city: string; visits: number }[] | null;
  products: { name: string; views: number }[] | null;
}

interface Realtime { now: number; perMinute: number[] }

const REALTIME_REFRESH_MS = 60_000;

// Fenêtre « Site public » : tous les KPI du site vitrine. Les données GA4 détaillées
// ne sont chargées qu'à l'ouverture (pas dans le polling du dashboard), et le temps
// réel n'est rafraîchi que tant que la fenêtre reste ouverte.
export function SiteVisitsModal({ onClose, range, visits, weekly }: {
  onClose: () => void;
  range: { start: string; end: string } | null; // null = mois en cours
  visits: number;
  weekly: WeeklyViews;
}) {
  const [details, setDetails] = useState<SiteDetails | null>(null);
  const [detailsError, setDetailsError] = useState(false);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [realtimeError, setRealtimeError] = useState(false);

  // Dépend des dates (chaînes), pas de l'objet `range` : le dashboard se ré-affiche
  // chaque seconde (horloge) et recréerait l'objet → rechargement en boucle.
  const rangeStart = range?.start ?? null;
  const rangeEnd = range?.end ?? null;
  useEffect(() => {
    const qs = rangeStart && rangeEnd ? `?startDate=${rangeStart}&endDate=${rangeEnd}` : '';
    fetch(`/api/analytics/details${qs}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setDetails)
      .catch(() => setDetailsError(true));
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetch('/api/analytics/realtime', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: Realtime) => { if (!cancelled) { setRealtime(data); setRealtimeError(false); } })
      .catch(() => { if (!cancelled) setRealtimeError(true); });
    load();
    const iv = setInterval(load, REALTIME_REFRESH_MS);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Fermeture avec Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' });
  const periodLabel = range ? `du ${fmtDate(range.start)} au ${fmtDate(range.end)}` : 'ce mois';
  const loadingDetails = details === null && !detailsError;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div>
            <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">Site public</p>
            <h3 className="text-[16px] font-bold text-[#0F172A]">Détail des visites <span className="font-semibold text-[#8A9BB5]">· {periodLabel}</span></h3>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors text-lg">&#x2715;</button>
        </div>

        <div className="overflow-y-auto px-5 md:px-6 py-5 flex flex-col gap-5">
          {/* KPI principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <KpiTile label="Visites" hint={periodLabel} value={visits.toLocaleString('fr-FR')} />

            <div className="rounded-2xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">En ligne maintenant</p>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#16A34A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> direct
                </span>
              </div>
              <p className="text-[28px] font-extrabold text-[#0F172A] leading-none mt-2">
                {realtime ? realtime.now : realtimeError ? '—' : '…'}
              </p>
              {realtime && <MinuteBars perMinute={realtime.perMinute} />}
              <p className="text-[11px] text-[#8A9BB5] mt-1">
                {realtimeError ? 'Temps réel indisponible pour le moment' : '30 dernières minutes · mis à jour chaque minute'}
              </p>
            </div>

            <KpiTile
              label="Clics WhatsApp"
              hint="bouton flottant, contact, devis"
              value={details?.whatsappClicks != null ? details.whatsappClicks.toLocaleString('fr-FR') : loadingDetails ? '…' : '—'}
            />
          </div>

          {/* Villes + produits consultés */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            <RankedList
              title="Villes des visiteurs"
              note="Estimée d'après l'adresse IP : approximative (beaucoup de mobiles apparaissent à Alger)."
              loading={loadingDetails}
              rows={details?.cities?.map((c) => ({ label: c.city, value: c.visits })) ?? null}
              unit="visites"
              empty="Aucune ville identifiée sur la période."
            />
            <RankedList
              title="Produits consultés"
              note="Référence choisie par le visiteur dans une catégorie. Suivi actif depuis la mise en ligne de ce bloc."
              loading={loadingDetails}
              rows={details?.products?.map((p) => ({ label: p.name, value: p.views })) ?? null}
              unit="vues"
              empty="Pas encore de données : elles apparaîtront au fil des visites."
            />
          </div>

          {/* Vues par catégorie (graphique existant de la carte) */}
          <div className="rounded-2xl border border-[#E2E8F0] p-4">
            <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-1">Vues par catégorie</p>
            <p className="text-[11px] text-[#8A9BB5] mb-3">Pages catégories du catalogue, 4 dernières semaines</p>
            <CategoryPageViewsChart data={weekly} />
          </div>

          <p className="text-[11px] text-[#ABBED1]">
            Source : Google Analytics (site public uniquement, hors pages admin). Les chiffres des rapports
            peuvent avoir quelques heures de retard ; seul « En ligne maintenant » est en direct.
          </p>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] p-4">
      <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">{label}</p>
      <p className="text-[28px] font-extrabold text-[#0F172A] leading-none mt-2">{value}</p>
      <p className="text-[11px] text-[#8A9BB5] mt-2">{hint}</p>
    </div>
  );
}

// Mini-histogramme minute par minute (de -29 min à maintenant)
function MinuteBars({ perMinute }: { perMinute: number[] }) {
  const max = Math.max(1, ...perMinute);
  return (
    <div className="flex items-end gap-[2px] h-8 mt-3" title="Visiteurs actifs par minute (30 dernières minutes)">
      {perMinute.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm" title={`il y a ${29 - i} min : ${v}`}
          style={{ height: `${v === 0 ? 8 : Math.max(15, (v / max) * 100)}%`, background: v === 0 ? '#E2E8F0' : '#4CAF4F' }} />
      ))}
    </div>
  );
}

function RankedList({ title, note, loading, rows, unit, empty }: {
  title: string; note: string; loading: boolean;
  rows: { label: string; value: number }[] | null; unit: string; empty: string;
}) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.value));
  return (
    <div className="rounded-2xl border border-[#E2E8F0] p-4">
      <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">{title}</p>
      <p className="text-[11px] text-[#8A9BB5] mb-3">{note}</p>
      {loading ? (
        <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>
      ) : rows === null ? (
        <p className="text-[12px] text-[#8A9BB5] py-4">Données indisponibles pour le moment.</p>
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-[#8A9BB5] py-4">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="font-semibold text-[#374151] truncate pr-2">{r.label}</span>
                <span className="text-[#8A9BB5] tabular-nums flex-shrink-0">{r.value.toLocaleString('fr-FR')} {unit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden">
                <div className="h-full rounded-full bg-[#4CAF4F]" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
