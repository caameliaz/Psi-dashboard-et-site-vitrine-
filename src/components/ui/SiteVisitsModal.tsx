'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { AdminSelect } from '@/components/ui/AdminSelect';

const CategoryPageViewsChart = dynamic(() => import('@/components/ui/DashboardCharts').then((m) => m.CategoryPageViewsChart), {
  ssr: false,
  loading: () => <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>,
});

const MonthlyVisitsChart = dynamic(() => import('@/components/ui/DashboardCharts').then((m) => m.MonthlyVisitsChart), {
  ssr: false,
  loading: () => <p className="text-[12px] text-[#8A9BB5] py-4">Chargement…</p>,
});

type WeeklyViews = { week: string; categories: { category: string; views: number; color: string }[] }[];

interface CartStats { crees: number; abandonnes: number; convertis: number; enCours: number; }

interface SiteDetails {
  whatsappClicks: number | null;
  products: { name: string; views: number }[] | null;
  cart: CartStats | null;
  monthlyVisits: { month: string; label: string; visits: number }[] | null;
}

interface Realtime { now: number; perMinute: number[] }

// Période propre au bloc « Pays » (indépendante du « Filtrer » de la fenêtre)
const COUNTRY_PERIODS = [
  { value: 'mois',  label: 'Ce mois' },
  { value: '3mois', label: '3 derniers mois' },
  { value: '6mois', label: '6 derniers mois' },
  { value: 'annee', label: 'Cette année' },
];

function countryRange(period: string): { start: string; end: string } {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = new Date();
  const start = new Date(end);
  if (period === 'mois') start.setDate(1);
  else if (period === '3mois') start.setMonth(start.getMonth() - 3);
  else if (period === '6mois') start.setMonth(start.getMonth() - 6);
  else { start.setMonth(0); start.setDate(1); } // cette année : 1er janvier
  return { start: iso(start), end: iso(end) };
}

const REALTIME_REFRESH_MS = 60_000;
// Installation de Google Analytics sur le site : aucune donnée avant cette date
const GA_SINCE_LABEL = '30/07/2026';

// Fenêtre « Site public » : tous les KPI du site vitrine. Les données GA4 détaillées
// ne sont chargées qu'à l'ouverture (pas dans le polling du dashboard), et le temps
// réel n'est rafraîchi que tant que la fenêtre reste ouverte.
export function SiteVisitsModal({ onClose, range, visits, weekly }: {
  onClose: () => void;
  range: { start: string; end: string } | null; // null = mois en cours
  visits: number;
  weekly: WeeklyViews;
}) {
  // Période de la fenêtre : celle de la carte à l'ouverture, modifiable ici (null = mois en cours)
  const [period, setPeriod] = useState(range);
  // Visites de la période choisie ICI (null = pas encore changée → chiffre de la carte)
  const [periodVisits, setPeriodVisits] = useState<number | null>(null);
  // Vues par catégorie de la période choisie ICI (null = pas encore changée → graphique de la carte)
  const [periodWeekly, setPeriodWeekly] = useState<WeeklyViews | null>(null);
  const [details, setDetails] = useState<SiteDetails | null>(null);
  // Bloc « Pays » : sa propre période (« Ce mois » par défaut)
  const [countryPeriod, setCountryPeriod] = useState('mois');
  const [countries, setCountries] = useState<{ country: string; visits: number }[] | null>(null);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [detailsError, setDetailsError] = useState(false);
  const [realtime, setRealtime] = useState<Realtime | null>(null);
  const [realtimeError, setRealtimeError] = useState(false);

  // Dépend des dates (chaînes), pas de l'objet période, pour ne recharger qu'au changement réel
  const periodStart = period?.start ?? null;
  const periodEnd = period?.end ?? null;
  useEffect(() => {
    const qs = periodStart && periodEnd ? `?startDate=${periodStart}&endDate=${periodEnd}` : '';
    fetch(`/api/analytics/details${qs}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setDetails)
      .catch(() => setDetailsError(true));
  }, [periodStart, periodEnd]);

  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    const r = countryRange(countryPeriod);
    fetch(`/api/analytics/countries?startDate=${r.start}&endDate=${r.end}`, { credentials: 'include' })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data: { countries: { country: string; visits: number }[] }) => { if (!cancelled) setCountries(data.countries); })
      .catch(() => { if (!cancelled) setCountries(null); })
      .finally(() => { if (!cancelled) setCountriesLoading(false); });
    return () => { cancelled = true; };
  }, [countryPeriod]);

  // Changement de période depuis la fenêtre → recharge aussi le nombre de visites
  const changePeriod = (start: string | null, end: string | null) => {
    const next = start && end ? { start, end } : null;
    setPeriod(next);
    setPeriodVisits(null);
    setPeriodWeekly(null);
    setDetails(null);
    setDetailsError(false);
    const qs = next ? `?startDate=${next.start}&endDate=${next.end}` : '';
    fetch(`/api/analytics${qs}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: { monthly?: { total?: number }; weekly?: WeeklyViews }) => {
        setPeriodVisits(data.monthly?.total ?? 0);
        setPeriodWeekly(data.weekly ?? []);
      })
      .catch(() => {});
  };

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
  const periodLabel = period ? `du ${fmtDate(period.start)} au ${fmtDate(period.end)}` : 'ce mois';
  const periodChanged = period?.start !== range?.start || period?.end !== range?.end;
  const shownVisits = periodChanged ? periodVisits : visits;
  const shownWeekly = periodChanged ? (periodWeekly ?? []) : weekly;
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
          <div className="flex items-center gap-2">
            <DateRangePicker onDateChange={changePeriod} />
            <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#E2E8F0] text-[#8A9BB5] transition-colors text-lg">&#x2715;</button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 md:px-6 py-5 flex flex-col gap-5">
          {/* KPI principaux */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <KpiTile label="Visites" hint={periodLabel} value={shownVisits != null ? shownVisits.toLocaleString('fr-FR') : '…'} />

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
              hint={`${periodLabel} · bouton flottant, contact, devis`}
              value={details?.whatsappClicks != null ? details.whatsappClicks.toLocaleString('fr-FR') : loadingDetails ? '…' : '—'}
            />
          </div>

          {/* Pays + produits consultés */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            <RankedList
              title="Pays des visiteurs"
              note="Pays déduit par Google Analytics d'après l'adresse IP : fiable, sauf visiteur derrière un VPN ou un proxy. Les États-Unis (robots) sont exclus."
              action={<AdminSelect className="w-[150px]" value={countryPeriod} onChange={setCountryPeriod} options={COUNTRY_PERIODS} />}
              loading={countriesLoading}
              rows={countries?.map((c) => ({ label: c.country, value: c.visits })) ?? null}
              unit="visites"
              empty="Aucun pays identifié sur la période."
            />
            <RankedList
              title={`Produits consultés · ${periodLabel}`}
              note="Référence choisie par le visiteur dans une catégorie. Suivi actif depuis la mise en ligne de ce bloc."
              loading={loadingDetails}
              rows={details?.products?.map((p) => ({ label: p.name, value: p.views })) ?? null}
              unit="vues"
              empty="Pas encore de données : elles apparaîtront au fil des visites."
            />
          </div>

          {/* Vues par catégorie (graphique de la carte) */}
          <div className="rounded-2xl border border-[#E2E8F0] p-4">
            <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-1">Vues par catégorie</p>
            <p className="text-[11px] text-[#8A9BB5] mb-3">Pages catégories du catalogue · {periodLabel}, une colonne par semaine (les semaines à venir restent vides)</p>
            <CategoryPageViewsChart data={shownWeekly} />
          </div>

          {/* Visites par mois (courbe) + Paniers — moitié / moitié */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            {/* Visites par mois — depuis septembre (les mois précédents n'étaient pas fiables) */}
            <div className="rounded-2xl border border-[#E2E8F0] p-4">
              <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest mb-1">Visites par mois</p>
              <p className="text-[11px] text-[#8A9BB5] mb-3">
                Depuis {details?.monthlyVisits?.[0]?.label ?? 'sept 2026'} · ne dépend pas de la période choisie
              </p>
              {loadingDetails ? (
                <p className="text-[12px] text-[#8A9BB5] py-2">Chargement…</p>
              ) : !details?.monthlyVisits ? (
                <p className="text-[12px] text-[#8A9BB5] py-2">Données indisponibles pour le moment.</p>
              ) : (
                <MonthlyVisitsChart data={details.monthlyVisits} />
              )}
            </div>
            {/* Paniers du site public — suivi anonyme, cf. schema.prisma CartSession */}
            <div className="rounded-2xl border border-[#E2E8F0] p-4">
              <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">Paniers · {periodLabel}</p>
              <p className="text-[11px] text-[#8A9BB5] mb-3">
                Suivi anonyme (aucune identité) — abandonné = plus de 24h sans y toucher.
              </p>
              {loadingDetails ? (
                <p className="text-[12px] text-[#8A9BB5] py-2">Chargement…</p>
              ) : !details?.cart ? (
                <p className="text-[12px] text-[#8A9BB5] py-2">Données indisponibles pour le moment.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <MiniStat label="Créés" value={details.cart.crees} color="#0F172A" />
                  <MiniStat label="Convertis" value={details.cart.convertis} color="#166534" />
                  <MiniStat label="Abandonnés" value={details.cart.abandonnes} color="#B91C1C" />
                  <MiniStat label="En cours" value={details.cart.enCours} color="#8A9BB5" />
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-[#ABBED1]">
            Source : Google Analytics (site public uniquement, hors pages admin), données disponibles depuis
            le {GA_SINCE_LABEL} — utilisez « Filtrer » pour remonter plus loin que ce mois. Les chiffres des
            rapports peuvent avoir quelques heures de retard ; seul « En ligne maintenant » est en direct.
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-[#F8FAFC] px-3 py-2.5">
      <p className="text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide">{label}</p>
      <p className="text-[20px] font-extrabold leading-tight mt-0.5" style={{ color }}>{value.toLocaleString('fr-FR')}</p>
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

function RankedList({ title, note, loading, rows, unit, empty, action }: {
  title: string; note: string; loading: boolean; action?: React.ReactNode;
  rows: { label: string; value: number }[] | null; unit: string; empty: string;
}) {
  const max = Math.max(1, ...(rows ?? []).map((r) => r.value));
  return (
    <div className="rounded-2xl border border-[#E2E8F0] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold text-[#ABBED1] uppercase tracking-widest">{title}</p>
        {action}
      </div>
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
