'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/lib/role-context';
import { RequirePerm } from '@/components/RequirePerm';

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

interface RawMaterial { id: string; reference: string; name: string; unit: string; price: number; stockMax: number; purchaseThreshold: number; available: number; reserved: number; }
interface RecipeItem { id: string; rawMaterialId: string; quantity: number; rawMaterial: RawMaterial; }
interface Prod { id: string; reference: string; name: string | null; mode: 'ACHETE' | 'FABRIQUE' | 'LES_DEUX'; recipeItems: RecipeItem[]; }

// ── Overlay : éditer la recette d'un produit ────────────────────────────────
function RecipeEditModal({ product, materials, onClose, onSave }: {
  product: Prod; materials: RawMaterial[];
  onClose: () => void; onSave: (items: { rawMaterialId: string; quantity: number }[]) => Promise<void>;
}) {
  const [lines, setLines] = useState<{ rawMaterialId: string; quantity: string }[]>(
    product.recipeItems.length > 0
      ? product.recipeItems.map((r) => ({ rawMaterialId: r.rawMaterialId, quantity: String(r.quantity) }))
      : [{ rawMaterialId: '', quantity: '' }]
  );
  const [saving, setSaving] = useState(false);

  const setLine = (i: number, patch: Partial<{ rawMaterialId: string; quantity: string }>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { rawMaterialId: '', quantity: '' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submit = async () => {
    const items = lines.filter((l) => l.rawMaterialId && Number(l.quantity) > 0).map((l) => ({ rawMaterialId: l.rawMaterialId, quantity: Number(l.quantity) }));
    setSaving(true);
    try { await onSave(items); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title={`Recette — ${product.reference}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          {lines.map((l, i) => {
            const mat = materials.find((m) => m.id === l.rawMaterialId);
            return (
              <div key={i} className="flex gap-2 items-center">
                <select value={l.rawMaterialId} onChange={(e) => setLine(i, { rawMaterialId: e.target.value })} className={inputClass}>
                  <option value="">Choisir une matière première</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.reference})</option>)}
                </select>
                <input value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal"
                  placeholder="Qté" style={{ width: 90 }} className={inputClass} />
                <span className="text-[12px] text-[#8A9BB5] w-14 flex-shrink-0">{mat?.unit ?? ''}</span>
                <button onClick={() => removeLine(i)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] text-xs font-bold">×</button>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addLine} className="text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C]">+ Ajouter une matière première</button>
        {materials.length === 0 && (
          <p className="text-[12px] text-[#8A9BB5]">Aucune matière première créée. Ajoutez-en une dans l&apos;onglet &quot;Matières premières&quot;.</p>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Overlay : Nouvelle / Modifier matière première ──────────────────────────
interface MaterialForm { reference: string; name: string; unit: string; price: string; stockMax: string; purchaseThreshold: string; available: string; }
const emptyMaterialForm: MaterialForm = { reference: '', name: '', unit: '', price: '', stockMax: '', purchaseThreshold: '', available: '' };

function MaterialModal({ initial, onClose, onSave }: { initial?: RawMaterial; onClose: () => void; onSave: (form: MaterialForm) => Promise<void> }) {
  const [form, setForm] = useState<MaterialForm>(initial ? {
    reference: initial.reference, name: initial.name, unit: initial.unit,
    price: String(initial.price), stockMax: String(initial.stockMax), purchaseThreshold: String(initial.purchaseThreshold), available: String(initial.available),
  } : emptyMaterialForm);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.reference.trim() || !form.name.trim() || !form.unit.trim() || !form.price.trim() || saving) return;
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title={initial ? 'Modifier la matière première' : 'Nouvelle matière première'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Référence</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value.toUpperCase() })} placeholder="ex: FILM-TPE-57" className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Unité de mesure</label>
            <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="ex: g, kg, m, bobine, unité" className={inputClass} />
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nom</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Film TPE 57 mm" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Prix (DA)</label>
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" placeholder="ex: 150" className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Seuil liste d&apos;achat</label>
            <input value={form.purchaseThreshold} onChange={(e) => setForm({ ...form, purchaseThreshold: e.target.value.replace(/[^\d]/g, '') })} inputMode="numeric" placeholder="ex: 70" className={inputClass} />
            <p className="text-[11px] text-[#ABBED1] mt-1">Déclenche le réassort préventif en liste d&apos;achat</p>
          </div>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Stock max <span className="text-[#ABBED1] font-normal">(facultatif — 140 par défaut)</span></label>
          <input value={form.stockMax} onChange={(e) => setForm({ ...form, stockMax: e.target.value.replace(/[^\d]/g, '') })} inputMode="numeric" placeholder="ex: 140" className={inputClass} />
          <p className="text-[11px] text-[#8A9BB5] mt-1">Sert de base au seuil par défaut (50% du stock max) si le seuil n&apos;est pas précisé.</p>
        </div>
        {!initial && (
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Stock disponible initial <span className="text-[#ABBED1] font-normal">(facultatif)</span></label>
            <input value={form.available} onChange={(e) => setForm({ ...form, available: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" placeholder="0" className={inputClass} />
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RecipesPageInner() {
  const { can } = useRole();
  const canEdit = can('modifier_produits');
  const canEditStock = can('modifier_stock');

  const [view, setView] = useState<'recettes' | 'matieres'>('recettes');
  const [products, setProducts] = useState<Prod[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Prod | null>(null);
  const [materialModal, setMaterialModal] = useState<'new' | RawMaterial | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([fetch('/api/products?all=true'), fetch('/api/raw-materials')]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProducts(data.filter((p: any) => p.mode === 'FABRIQUE' || p.mode === 'LES_DEUX'));
      }
      if (mRes.ok) setMaterials(await mRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredProducts = useMemo(() => products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.reference.toLowerCase().includes(q) || (p.name ?? '').toLowerCase().includes(q);
  }), [products, search]);
  const filteredMaterials = useMemo(() => materials.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.reference.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
  }), [materials, search]);

  const saveRecipe = async (productId: string, items: { rawMaterialId: string; quantity: number }[]) => {
    const res = await fetch(`/api/products/${productId}/recipe`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? "Échec de l'enregistrement de la recette"); return; }
    await fetchAll();
  };

  const saveMaterial = async (form: MaterialForm) => {
    const isEdit = materialModal && materialModal !== 'new';
    const url = isEdit ? `/api/raw-materials/${(materialModal as RawMaterial).id}` : '/api/raw-materials';
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: form.reference.trim(), name: form.name.trim(), unit: form.unit.trim(),
        price: Number(form.price) || 0,
        ...(form.purchaseThreshold.trim() !== '' && { purchaseThreshold: Number(form.purchaseThreshold) }),
        ...(form.stockMax.trim() !== '' && { stockMax: Number(form.stockMax) }),
        ...(!isEdit && { available: Number(form.available) || 0 }),
      }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? 'Échec de l\'enregistrement'); return; }
    await fetchAll();
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Recettes de production</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">
            {loading ? 'Chargement…' : view === 'recettes'
              ? `${products.length} produit${products.length !== 1 ? 's' : ''} fabriqué${products.length !== 1 ? 's' : ''}`
              : `${materials.length} matière${materials.length !== 1 ? 's' : ''} première${materials.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canEditStock && (
          <button onClick={() => setMaterialModal('new')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#4CAF4F' }}>
            + Nouvelle matière première
          </button>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9] w-fit">
          {([['recettes', 'Recettes'], ['matieres', 'Matières premières']] as const).map(([val, lbl]) => (
            <button key={val} onClick={() => setView(val)} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${view === val ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>
              {lbl}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={view === 'recettes' ? 'Rechercher une référence...' : 'Rechercher une matière...'}
          className="px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] w-full max-w-xs" />
      </div>

      {view === 'recettes' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredProducts.map((p) => (
              <div key={p.id} className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden flex flex-col">
                <div className="px-5 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-[#0F172A]">{p.name || p.reference}</p>
                    <p className="text-[12px] text-[#8A9BB5]">{p.reference}</p>
                  </div>
                  {canEdit && (
                    <button onClick={() => setEditingProduct(p)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-white bg-white/60">
                      Modifier
                    </button>
                  )}
                </div>
                {p.recipeItems.length === 0 ? (
                  <p className="px-5 py-6 text-[13px] text-[#8A9BB5] text-center">Aucune recette définie.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="px-5 pt-4 pb-2 text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide">Ingrédient</th>
                        <th className="px-5 pt-4 pb-2 text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide text-right">Qté / unité</th>
                        <th className="px-5 pt-4 pb-2 text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide text-right">Unité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.recipeItems.map((r, i) => (
                        <tr key={r.id} className={i > 0 ? 'border-t border-[#F0F4F8]' : ''}>
                          <td className="px-5 py-2.5">
                            <p className="text-[12px] font-bold text-[#4F46E5]">{r.rawMaterial.reference}</p>
                            <p className="text-[11px] text-[#8A9BB5]">{r.rawMaterial.name}</p>
                          </td>
                          <td className="px-5 py-2.5 text-[13px] font-bold text-[#0F172A] text-right tabular-nums">{r.quantity}</td>
                          <td className="px-5 py-2.5 text-[12px] text-[#8A9BB5] text-right">{r.rawMaterial.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-20 text-[#8A9BB5]">
              <p className="text-[15px] font-semibold">Aucun produit fabriqué</p>
              <p className="text-[13px] mt-1">Les produits en mode &quot;Fabriqué&quot; ou &quot;Les deux&quot; apparaissent ici.</p>
            </div>
          )}
        </>
      )}

      {view === 'matieres' && (
        <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Référence</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Nom</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Unité</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Prix</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Stock max</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Seuil d&apos;alerte</th>
                {canEditStock && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((m) => (
                <tr key={m.id} className="border-b border-[#F0F4F8] last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] tabular-nums">{m.reference}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A]">{m.name}</td>
                  <td className="px-4 py-3 text-[12px] text-[#8A9BB5]">{m.unit}</td>
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{m.price.toLocaleString('fr-FR')} DA</td>
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{m.stockMax}</td>
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{m.purchaseThreshold}</td>
                  {canEditStock && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setMaterialModal(m)} className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">Modifier</button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredMaterials.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[#8A9BB5]">Aucune matière première. {canEditStock && 'Ajoutez-en une pour commencer.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingProduct && (
        <RecipeEditModal
          product={editingProduct} materials={materials}
          onClose={() => setEditingProduct(null)}
          onSave={(items) => saveRecipe(editingProduct.id, items)}
        />
      )}
      {materialModal && (
        <MaterialModal initial={materialModal === 'new' ? undefined : materialModal} onClose={() => setMaterialModal(null)} onSave={saveMaterial} />
      )}
    </div>
  );
}

export default function RecipesPage() {
  return <RequirePerm perm="voir_stock"><RecipesPageInner /></RequirePerm>;
}
