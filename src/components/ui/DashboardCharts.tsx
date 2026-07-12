'use client';

// Graphiques du dashboard (Recharts). Importé en DYNAMIC (ssr:false) depuis le
// dashboard → Recharts n'est chargé QUE sur cette page, jamais sur le site public
// ni ailleurs dans l'admin. Aucun impact de poids sur le reste du site.

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const CARD = 'bg-white rounded-2xl border border-[#E4EBF5] p-5 shadow-sm';

// Palette sobre cohérente avec le reste du dashboard
const BAR_COLORS = ['#7C6BAF', '#8A6FA8', '#9B7FB5', '#5E6B7A', '#6B7A8A', '#B0A38F', '#C0B39F', '#8A9BB5', '#9BAAC0', '#AAB8CC'];

function tooltipStyle() {
  return {
    contentStyle: { borderRadius: 12, border: '1px solid #E4EBF5', fontSize: 12, boxShadow: '0 8px 24px rgba(171,190,209,0.35)' },
    labelStyle: { fontWeight: 700, color: '#0F172A' },
  };
}

export function WilayaBarChart({ data }: { data: { wilaya: string; count: number }[] }) {
  if (!data || data.length === 0) {
    return <div className={CARD}><h3 className="text-[14px] font-bold text-[#0F172A] mb-3">Commandes par wilaya</h3><p className="text-[12px] text-[#8A9BB5] py-8 text-center">Aucune donnée</p></div>;
  }
  // Nettoie le libellé "16 - Alger" → "Alger"
  const clean = data.map((d) => ({ ...d, label: d.wilaya.includes(' - ') ? d.wilaya.split(' - ')[1] : d.wilaya }));
  return (
    <div className={CARD}>
      <h3 className="text-[14px] font-bold text-[#0F172A] mb-1">Commandes par wilaya</h3>
      <p className="text-[11px] text-[#8A9BB5] mb-4">Top {clean.length}</p>
      <ResponsiveContainer width="100%" height={Math.max(180, clean.length * 30)}>
        <BarChart data={clean} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} stroke="#F2F4F7" />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#8A9BB5' }} allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#374151' }} width={90} />
          <Tooltip {...tooltipStyle()} cursor={{ fill: '#F8FAFC' }} />
          <Bar dataKey="count" name="Commandes" radius={[0, 6, 6, 0]}>
            {clean.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendLineChart({ data }: { data: { mois: string; commandes: number; devis: number }[] }) {
  if (!data || data.length === 0) {
    return <div className={CARD}><h3 className="text-[14px] font-bold text-[#0F172A] mb-3">Évolution sur 6 mois</h3><p className="text-[12px] text-[#8A9BB5] py-8 text-center">Aucune donnée</p></div>;
  }
  return (
    <div className={CARD}>
      <h3 className="text-[14px] font-bold text-[#0F172A] mb-1">Évolution sur 6 mois</h3>
      <p className="text-[11px] text-[#8A9BB5] mb-4">Commandes &amp; devis</p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: -12, right: 12, top: 6 }}>
          <CartesianGrid stroke="#F2F4F7" />
          <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#8A9BB5' }} />
          <YAxis tick={{ fontSize: 11, fill: '#8A9BB5' }} allowDecimals={false} />
          <Tooltip {...tooltipStyle()} />
          <Line type="monotone" dataKey="commandes" name="Commandes" stroke="#4CAF4F" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="devis" name="Devis" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-[11px] text-[#374151]"><span className="w-3 h-1.5 rounded-full" style={{ background: '#4CAF4F' }} />Commandes</span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#374151]"><span className="w-3 h-1.5 rounded-full" style={{ background: '#8B5CF6' }} />Devis</span>
      </div>
    </div>
  );
}
