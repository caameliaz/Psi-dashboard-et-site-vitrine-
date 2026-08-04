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
    contentStyle: { borderRadius: 12, border: '2px solid #E4EBF5', fontSize: 12, boxShadow: '0 8px 24px rgba(171,190,209,0.35)' },
    labelStyle: { fontWeight: 700, color: '#0F172A' },
  };
}

export function WilayaBarChart({ data, isFiltered = false }: { data: { wilaya: string; count: number }[]; isFiltered?: boolean }) {
  if (!data || data.length === 0) {
    return <div className={CARD}><h3 className="text-[14px] font-bold text-[#0F172A] mb-3">Commandes par wilaya</h3><p className="text-[12px] text-[#8A9BB5] py-8 text-center">Aucune donnée pour ce mois</p></div>;
  }
  // Nettoie le libellé "16 - Alger" → "Alger"
  const clean = data.map((d) => ({ ...d, label: d.wilaya.includes(' - ') ? d.wilaya.split(' - ')[1] : d.wilaya }));
  return (
    <div className={CARD}>
      <h3 className="text-[14px] font-bold text-[#0F172A] mb-1">Commandes par wilaya</h3>
      <p className="text-[11px] text-[#8A9BB5] mb-4">Top {clean.length}{!isFiltered && ' (ce mois)'}</p>
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
    return <p className="text-[11px] md:text-[12px] text-[#8A9BB5] py-4 text-center">Aucune donnée</p>;
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: -12, right: 12, top: 6 }}>
          <CartesianGrid stroke="#F2F4F7" />
          <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#8A9BB5' }} />
          <YAxis tick={{ fontSize: 11, fill: '#8A9BB5' }} allowDecimals={false} />
          <Tooltip {...tooltipStyle()} />
          <Line type="monotone" dataKey="commandes" name="Commandes" stroke="#4CAF4F" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="devis" name="Devis" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-2 justify-center">
        <span className="text-[11px] font-semibold text-[#8A9BB5]">Évolution sur 6 mois</span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#374151]"><span className="w-3 h-1.5 rounded-full" style={{ background: '#4CAF4F' }} />Commandes</span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#374151]"><span className="w-3 h-1.5 rounded-full" style={{ background: '#8B5CF6' }} />Devis</span>
      </div>
    </>
  );
}

export function SalesLineChart({ data }: { data: { mois: string; ventes: number }[] }) {
  if (!data || data.length === 0) {
    return <p className="text-[11px] md:text-[12px] text-[#8A9BB5] py-4 text-center">Aucune donnée</p>;
  }
  
  // Formater les valeurs pour l'affichage (en milliers de DA)
  const formatDA = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: -12, right: 12, top: 6 }}>
          <CartesianGrid stroke="#F2F4F7" />
          <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#8A9BB5' }} />
          <YAxis tick={{ fontSize: 11, fill: '#8A9BB5' }} tickFormatter={formatDA} />
          <Tooltip {...tooltipStyle()} formatter={(value) => typeof value === 'number' ? [`${value.toLocaleString('fr-FR')} DA`, 'Ventes'] : [String(value), 'Ventes']} />
          <Line type="monotone" dataKey="ventes" name="Ventes" stroke="#4CAF4F" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-2 justify-center">
        <span className="text-[11px] font-semibold text-[#8A9BB5]">Évolution sur 6 mois</span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#374151]">
          <span className="w-3 h-1.5 rounded-full" style={{ background: '#4CAF4F' }} />
          Ventes (DA)
        </span>
      </div>
    </>
  );
}

export function CategoryPageViewsChart({ data }: { data: { week: string; categories: { category: string; views: number; color: string }[] }[] }) {
  if (!data || data.length === 0) {
    return <p className="text-[11px] md:text-[12px] text-[#8A9BB5] py-4 text-center">Aucune donnée</p>;
  }

  // Préparer les données pour le graphique empilé
  const chartData = data.map((item) => {
    const row: Record<string, string | number> = { week: item.week };
    item.categories.forEach((cat) => {
      row[cat.category] = cat.views;
    });
    return row;
  });

  // Extraire les catégories uniques avec leurs couleurs
  const categories = data[0]?.categories ?? [];

  return (
    <>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ left: -12, right: 12, top: 6 }} barCategoryGap="15%">
          <CartesianGrid stroke="#F2F4F7" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#8A9BB5' }} />
          <YAxis tick={{ fontSize: 11, fill: '#8A9BB5' }} allowDecimals={false} />
          <Tooltip {...tooltipStyle()} cursor={{ fill: '#F8FAFC' }} />
          {categories.map((cat, index) => (
            <Bar 
              key={cat.category} 
              dataKey={cat.category} 
              stackId="a" 
              fill={cat.color} 
              radius={index === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-2 justify-center flex-wrap">
        {categories.map((cat) => (
          <span key={cat.category} className="flex items-center gap-1.5 text-[11px] text-[#374151]">
            <span className="w-3 h-1.5 rounded-full" style={{ background: cat.color }} />
            {cat.category}
          </span>
        ))}
      </div>
    </>
  );
}

export function VisitsBarChart({ data }: { data: { category: string; visits: number; color: string }[] }) {
  if (!data || data.length === 0) {
    return <p className="text-[11px] md:text-[12px] text-[#8A9BB5] py-4 text-center">Aucune donnée</p>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ left: -20, right: 8, top: 6, bottom: 0 }}>
          <CartesianGrid stroke="#F2F4F7" horizontal={true} vertical={false} />
          <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#8A9BB5' }} />
          <YAxis tick={{ fontSize: 10, fill: '#8A9BB5' }} allowDecimals={false} />
          <Tooltip {...tooltipStyle()} />
          <Bar dataKey="visits" name="Visites" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-3 mt-2 justify-center flex-wrap">
        {data.map((d, i) => (
          <span key={i} className="flex items-center gap-1.5 text-[10px] text-[#374151]">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            {d.category}
          </span>
        ))}
      </div>
    </>
  );
}

export function ConversionRateChart({ data }: { data: { label: string; rate: number }[] }) {
  if (!data || data.length === 0) {
    return <div className={CARD}><h3 className="text-[14px] font-bold text-[#0F172A] mb-3">Taux de conversion</h3><p className="text-[12px] text-[#8A9BB5] py-8 text-center">Aucune donnée pour ce mois</p></div>;
  }
  
  return (
    <div className={CARD}>
      <h3 className="text-[14px] font-bold text-[#0F172A] mb-1">Taux de conversion</h3>
      <p className="text-[11px] text-[#8A9BB5] mb-4">Devis → Ventes</p>
      <ResponsiveContainer width="100%" height={Math.max(400, data.length * 45)}>
        <BarChart data={data} margin={{ left: 8, right: 8, top: 6, bottom: 20 }}>
          <CartesianGrid stroke="#F2F4F7" vertical={false} />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 10, fill: '#374151' }} 
            angle={-45} 
            textAnchor="end" 
            height={100}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#8A9BB5' }} 
            domain={[0, 100]} 
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip {...tooltipStyle()} formatter={(value) => typeof value === 'number' ? `${value}%` : String(value)} cursor={{ fill: '#F8FAFC' }} />
          <Bar dataKey="rate" name="Taux" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
