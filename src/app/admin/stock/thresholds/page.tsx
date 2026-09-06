'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/role-context';
import { RequirePerm } from '@/components/RequirePerm';

interface StockProduct {
  id: string; reference: string; name: string | null; mode: 'ACHETE' | 'FABRIQUE' | 'LES_DEUX';
  stockMax: number; purchaseThreshold: number; productionThreshold: number;
}
interface StockMaterial { id: string; reference: string; name: string; stockMax: number; purchaseThreshold: number; }

type Row = {
  id: string; reference: string; name: string; type: 'Produit fini' | 'Matière première';
  stockMax: number; purchaseThreshold: number | null; productionThreshold: number | null;
  isProduct: boolean; mode?: 'ACHETE' | 'FABRIQUE' | 'LES_DEUX';
};

const inputSmall = "w-20 px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[13px] text-[#0F172A] text-right tabular-nums focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] bg-[#F8FAFC]";

function ThresholdsPageInner() {
  const { can } = useRole();
  const canEdit = can('modifier_stock');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { stockMax?: string; purchase?: string; production?: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([fetch('/api/stock/products'), fetch('/api/stock/materials')]);
      const products: StockProduct[] = pRes.ok ? await pRes.json() : [];
      const materials: StockMaterial[] = mRes.ok ? await mRes.json() : [];
      const productRows: Row[] = products.map((p) => ({
        id: p.id, reference: p.reference, name: p.name ?? p.reference, type: 'Produit fini',
        stockMax: p.stockMax,
        purchaseThreshold: (p.mode === 'ACHETE' || p.mode === 'LES_DEUX') ? p.purchaseThreshold : null,
        productionThreshold: (p.mode === 'FABRIQUE' || p.mode === 'LES_DEUX') ? p.productionThreshold : null,
        isProduct: true, mode: p.mode,
      }));
      const materialRows: Row[] = materials.map((m) => ({
        id: m.id, reference: m.reference, name: m.name, type: 'Matière première',
        stockMax: m.stockMax,
        purchaseThreshold: m.purchaseThreshold, productionThreshold: null, isProduct: false,
      }));
      setRows([...productRows, ...materialRows]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const draftFor = (row: Row) => drafts[row.id] ?? {};

  const save = async (row: Row) => {
    const d = draftFor(row);
    if (d.stockMax === undefined && d.purchase === undefined && d.production === undefined) return;
    setSaving(row.id);
    try {
      const url = row.isProduct ? `/api/products/${row.id}` : `/api/raw-materials/${row.id}`;
      const body: Record<string, number> = {};
      if (d.stockMax !== undefined) body.stockMax = Number(d.stockMax);
      if (d.purchase !== undefined) body.purchaseThreshold = Number(d.purchase);
      if (d.production !== undefined && row.isProduct) body.productionThreshold = Number(d.production);
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? 'Échec de l\'enregistrement'); return; }
      setDrafts((ds) => { const n = { ...ds }; delete n[row.id]; return n; });
      await fetchAll();
    } finally { setSaving(null); }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-[#8A9BB5] mb-1">
            <Link href="/admin/stock" className="hover:text-[#374151]">Stock</Link>
            <span>/</span>
            <span className="text-[#0F172A] font-semibold">Seuils</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Seuils de réassort</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${rows.length} référence(s)`}</p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden bg-white overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Référence</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Type</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Stock max</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Seuil liste d&apos;achat</th>
              <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Seuil liste de production</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const d = draftFor(row);
              const dirty = d.purchase !== undefined || d.production !== undefined;
              return (
                <tr key={row.id} className="border-b border-[#F0F4F8] last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] tabular-nums">{row.reference}</span>
                    <p className="text-[11px] text-[#8A9BB5] mt-0.5">{row.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${row.isProduct ? 'bg-[#F0FDF4] text-[#166534]' : 'bg-[#EFF6FF] text-[#1E40AF]'}`}>{row.type}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEdit ? (
                      <input value={d.stockMax ?? String(row.stockMax)} onChange={(e) => setDrafts((ds) => ({ ...ds, [row.id]: { ...ds[row.id], stockMax: e.target.value.replace(/[^\d]/g, '') } }))} inputMode="numeric" className={inputSmall} />
                    ) : <span className="text-[13px] font-semibold text-[#0F172A]">{row.stockMax}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.purchaseThreshold === null ? <span className="text-[13px] text-[#ABBED1]">—</span> : canEdit ? (
                      <input value={d.purchase ?? String(row.purchaseThreshold)} onChange={(e) => setDrafts((ds) => ({ ...ds, [row.id]: { ...ds[row.id], purchase: e.target.value.replace(/[^\d]/g, '') } }))} inputMode="numeric" className={inputSmall} />
                    ) : <span className="text-[13px] font-semibold text-[#0F172A]">{row.purchaseThreshold}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.productionThreshold === null ? <span className="text-[13px] text-[#ABBED1]">—</span> : canEdit ? (
                      <input value={d.production ?? String(row.productionThreshold)} onChange={(e) => setDrafts((ds) => ({ ...ds, [row.id]: { ...ds[row.id], production: e.target.value.replace(/[^\d]/g, '') } }))} inputMode="numeric" className={inputSmall} />
                    ) : <span className="text-[13px] font-semibold text-[#0F172A]">{row.productionThreshold}</span>}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => save(row)} disabled={!dirty || saving === row.id}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white disabled:opacity-40 transition-colors" style={{ background: '#4CAF4F' }}>
                        {saving === row.id ? '…' : 'Enregistrer'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px] text-[#8A9BB5]">Aucune référence.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ThresholdsPage() {
  return <RequirePerm perm="voir_stock"><ThresholdsPageInner /></RequirePerm>;
}
