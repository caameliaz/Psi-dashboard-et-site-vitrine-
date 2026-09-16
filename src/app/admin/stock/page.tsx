'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/lib/role-context';
import { RequirePerm } from '@/components/RequirePerm';

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

interface StockProduct {
  id: string; reference: string; name: string | null; price: number;
  mode: 'ACHETE' | 'FABRIQUE' | 'LES_DEUX';
  // `available` inclut le stock attribué aux commerciaux (plus décrémenté à l'attribution,
  // cf. stock/assignments/route.ts) — `assignedToCommercials` sert à en dériver la colonne
  // "Stock hors commerciaux" (available + reserved − assignedToCommercials) à l'affichage :
  // tout ce qui est physiquement en entrepôt OU engagé sur une commande, moins ce qui est
  // chez un commercial.
  available: number; reserved: number; inDelivery: number; returned: number; assignedToCommercials: number;
  purchaseThreshold: number; productionThreshold: number;
  category: { name: string } | null;
  recipeItems: { id: string }[];
}
interface StockMaterial {
  id: string; reference: string; name: string; unit: string; price: number;
  purchaseThreshold: number; available: number; reserved: number;
}
interface EmployeeAssignment { id: string; name: string; totalAssigned: number; }
interface AssignmentLine {
  assignmentId: string; productId: string; productReference: string; productName: string | null;
  quantity: number; remainingStock: number; assignedAt: string;
}

const PRODUCT_FIELD_LABELS = { available: 'Disponible', reserved: 'Réservé', inDelivery: 'En livraison', returned: 'En retour' } as const;
const MATERIAL_FIELD_LABELS = { available: 'Disponible', reserved: 'Réservé' } as const;

function statusBadge(available: number, threshold: number | null | undefined) {
  const t = threshold ?? 0;
  if (available <= 0) return <span className="px-2 py-0.5 rounded-md bg-[#FEF2F2] text-[#EF4444] text-[11px] font-bold">Rupture</span>;
  if (t > 0 && available <= t) return <span className="px-2 py-0.5 rounded-md bg-[#FFFBEB] text-[#B45309] text-[11px] font-bold">Stock faible</span>;
  return <span className="px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[#166534] text-[11px] font-bold">En stock</span>;
}

// ── Overlay : Restock (Disponible uniquement) / Correction (champ exact) ───
function StockActionModal({ label, unit, item, isProduct, needsMode, onClose, onRestock, onCorrection }: {
  label: string; unit: string; item: StockProduct | StockMaterial; isProduct: boolean; needsMode: boolean;
  onClose: () => void;
  onRestock: (qty: number, mode?: 'produire' | 'acheter') => Promise<void>;
  onCorrection: (field: string, qty: number) => Promise<void>;
}) {
  const [tab, setTab] = useState<'restock' | 'correction'>('restock');
  const [qty, setQty] = useState('');
  const [mode, setMode] = useState<'produire' | 'acheter'>('produire');
  const fieldLabels = isProduct ? PRODUCT_FIELD_LABELS : MATERIAL_FIELD_LABELS;
  const [field, setField] = useState<string>('available');
  const [saving, setSaving] = useState(false);

  const currentFieldValue = (item as any)[field] as number;

  const submit = async () => {
    const n = Number(qty);
    if (!qty.trim() || Number.isNaN(n) || n < 0) return;
    setSaving(true);
    try {
      if (tab === 'restock') await onRestock(n, needsMode ? mode : undefined);
      else await onCorrection(field, n);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Stock — ${label}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(fieldLabels).map(([key, lbl]) => (
            <div key={key} className="px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#F0F4F8]">
              <p className="text-[10px] font-bold text-[#8A9BB5] uppercase">{lbl}</p>
              <p className="text-[14px] font-bold text-[#0F172A] tabular-nums">{(item as any)[key]} {unit}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9]">
          <button onClick={() => setTab('restock')} className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-colors ${tab === 'restock' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Réapprovisionner</button>
          <button onClick={() => setTab('correction')} className={`flex-1 py-1.5 rounded-md text-[12px] font-bold transition-colors ${tab === 'correction' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Correction</button>
        </div>

        {tab === 'restock' ? (
          <>
            <p className="text-[11px] text-[#8A9BB5]">Le réapprovisionnement augmente uniquement le stock <strong>Disponible</strong>{isProduct ? ' (et décrémente les matières premières si le produit est fabriqué).' : '.'}</p>
            {needsMode && (
              <div>
                <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Mode</label>
                <div className="flex gap-2">
                  <button onClick={() => setMode('produire')} className={`flex-1 py-2 rounded-lg border text-[12px] font-bold ${mode === 'produire' ? 'border-[#4CAF4F] bg-[#F0FDF4] text-[#166534]' : 'border-[#E2E8F0] text-[#374151]'}`}>Produire (utilise la recette)</button>
                  <button onClick={() => setMode('acheter')} className={`flex-1 py-2 rounded-lg border text-[12px] font-bold ${mode === 'acheter' ? 'border-[#4CAF4F] bg-[#F0FDF4] text-[#166534]' : 'border-[#E2E8F0] text-[#374151]'}`}>Acheter</button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Quantité à ajouter ({unit})</label>
              <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="ex: 50" className={inputClass} autoFocus />
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] text-[#8A9BB5]">La correction fixe directement un statut à une valeur exacte, sans aucun effet sur les autres statuts ni sur les matières premières.</p>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Statut à corriger</label>
              <select value={field} onChange={(e) => setField(e.target.value)} className={inputClass}>
                {Object.entries(fieldLabels).map(([key, lbl]) => <option key={key} value={key}>{lbl}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nouvelle valeur ({unit}) — actuel : {currentFieldValue}</label>
              <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="ex: 50" className={inputClass} autoFocus />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving || !qty.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Overlay : Attribuer du stock à un employé ───────────────────────────────
function AssignModal({ employees, products, onClose, onSave }: {
  employees: EmployeeAssignment[]; products: StockProduct[];
  onClose: () => void; onSave: (employeeId: string, lines: { productId: string; quantity: number }[]) => Promise<void>;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [lines, setLines] = useState<{ productId: string; quantity: string }[]>([{ productId: '', quantity: '' }]);
  const [saving, setSaving] = useState(false);

  // On propose/plafonne sur le stock HORS COMMERCIAUX (available + reserved − déjà attribué),
  // pas `available` seul — même formule que la colonne "Hors commerciaux" et que le contrôle
  // serveur (cf. /api/stock/assignments), sinon on proposerait d'attribuer un produit dont le
  // dispo est à 0 mais qui a du réservé pas encore tout attribué, ou l'inverse.
  const horsCommerciaux = (p: StockProduct) => Math.max(0, p.available + p.reserved - p.assignedToCommercials);
  const availableProducts = products.filter((p) => horsCommerciaux(p) > 0);
  const setLine = (i: number, patch: Partial<{ productId: string; quantity: string }>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines((ls) => [...ls, { productId: '', quantity: '' }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const submit = async () => {
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0).map((l) => ({ productId: l.productId, quantity: Number(l.quantity) }));
    if (!employeeId || validLines.length === 0 || saving) return;
    setSaving(true);
    try { await onSave(employeeId, validLines); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title="Attribuer du stock" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Employé</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass}>
            <option value="">Choisir un employé</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[12px] font-semibold text-[#374151]">Produits</label>
            <button type="button" onClick={addLine} className="text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C]">+ Ajouter une ligne</button>
          </div>
          <div className="flex flex-col gap-2">
            {lines.map((l, i) => {
              const prod = availableProducts.find((p) => p.id === l.productId);
              return (
                <div key={i} className="flex gap-2 items-center">
                  <select value={l.productId} onChange={(e) => setLine(i, { productId: e.target.value })} className={inputClass}>
                    <option value="">Choisir une référence</option>
                    {availableProducts.map((p) => <option key={p.id} value={p.id}>{p.name || p.reference} ({p.reference}) — {horsCommerciaux(p)} hors commerciaux</option>)}
                  </select>
                  <input value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal"
                    placeholder="Qté" max={prod ? horsCommerciaux(prod) : undefined} style={{ width: 80 }} className={inputClass} />
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] text-xs font-bold">×</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving || !employeeId} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Attribution…' : 'Attribuer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Overlay : Restocker (dédié, indépendant de "Gérer le stock") ───────────
function RestockOnlyModal({ products, materials, onClose, onRestock }: {
  products: StockProduct[]; materials: StockMaterial[];
  onClose: () => void; onRestock: (type: 'product' | 'material', id: string, qty: number, mode?: 'produire' | 'acheter') => Promise<void>;
}) {
  const [type, setType] = useState<'product' | 'material'>('product');
  const [id, setId] = useState('');
  const [qty, setQty] = useState('');
  const [mode, setMode] = useState<'produire' | 'acheter'>('produire');
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === id);
  const needsMode = type === 'product' && selectedProduct?.mode === 'LES_DEUX';

  const submit = async () => {
    const n = Number(qty);
    if (!id || !n || n <= 0 || saving) return;
    setSaving(true);
    try { await onRestock(type, id, n, needsMode ? mode : undefined); onClose(); } finally { setSaving(false); }
  };

  return (
    <Modal title="Restocker" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9]">
          <button onClick={() => { setType('product'); setId(''); }} className={`flex-1 py-1.5 rounded-md text-[12px] font-bold ${type === 'product' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Produit fini</button>
          <button onClick={() => { setType('material'); setId(''); }} className={`flex-1 py-1.5 rounded-md text-[12px] font-bold ${type === 'material' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>Matière première</button>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Référence</label>
          <select value={id} onChange={(e) => setId(e.target.value)} className={inputClass}>
            <option value="">Choisir une référence</option>
            {type === 'product'
              ? products.map((p) => <option key={p.id} value={p.id}>{p.name || p.reference} ({p.reference}) — {p.available} disponible</option>)
              : materials.map((m) => <option key={m.id} value={m.id}>{m.name || m.reference} ({m.reference}) — {m.available} disponible</option>)}
          </select>
        </div>
        {needsMode && (
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Mode</label>
            <div className="flex gap-2">
              <button onClick={() => setMode('produire')} className={`flex-1 py-2 rounded-lg border text-[12px] font-bold ${mode === 'produire' ? 'border-[#4CAF4F] bg-[#F0FDF4] text-[#166534]' : 'border-[#E2E8F0] text-[#374151]'}`}>Produire</button>
              <button onClick={() => setMode('acheter')} className={`flex-1 py-2 rounded-lg border text-[12px] font-bold ${mode === 'acheter' ? 'border-[#4CAF4F] bg-[#F0FDF4] text-[#166534]' : 'border-[#E2E8F0] text-[#374151]'}`}>Acheter</button>
            </div>
          </div>
        )}
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Quantité à ajouter</label>
          <input value={qty} onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="ex: 50" className={inputClass} autoFocus />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={submit} disabled={saving || !id || !qty.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Enregistrement…' : 'Restocker'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StockPageInner() {
  const { can } = useRole();
  const canEdit = can('modifier_stock');

  const [tab, setTab] = useState<'produits' | 'matieres' | 'commercial'>('produits');
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [materials, setMaterials] = useState<StockMaterial[]>([]);
  const [employees, setEmployees] = useState<EmployeeAssignment[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [actionTarget, setActionTarget] = useState<{ type: 'product' | 'material'; item: StockProduct | StockMaterial; label: string; unit: string; needsMode: boolean } | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string; lines: AssignmentLine[] } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, mRes, eRes] = await Promise.all([
        fetch('/api/stock/products'), fetch('/api/stock/materials'), fetch('/api/stock/assignments'),
      ]);
      if (pRes.ok) setProducts(await pRes.json());
      if (mRes.ok) setMaterials(await mRes.json());
      if (eRes.ok) setEmployees(await eRes.json());
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

  const loadEmployeeDetail = async (id: string) => {
    const res = await fetch(`/api/stock/assignments/${id}`);
    if (res.ok) setSelectedEmployee(await res.json());
  };

  const doRestock = async (type: 'product' | 'material', id: string, quantity: number, mode?: 'produire' | 'acheter') => {
    const res = await fetch('/api/stock/restock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, quantity, mode }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? 'Échec du réapprovisionnement'); return; }
    await fetchAll();
  };
  const doCorrection = async (type: 'product' | 'material', id: string, field: string, quantity: number) => {
    const res = await fetch('/api/stock/correction', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id, field, quantity }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? 'Échec de la correction'); return; }
    await fetchAll();
  };

  const saveAssignment = async (employeeId: string, lines: { productId: string; quantity: number }[]) => {
    const res = await fetch('/api/stock/assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, lines }),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? 'Échec de l\'attribution'); return; }
    await fetchAll();
  };

  const withdraw = async (assignmentId: string, quantity?: number) => {
    const res = await fetch(`/api/stock/assignments/item/${assignmentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quantity != null ? { quantity } : {}),
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); alert(err.error ?? 'Échec du retrait'); return; }
    await fetchAll();
    if (selectedEmployee) await loadEmployeeDetail(selectedEmployee.id);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Stock</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${products.length} produit(s) · ${materials.length} matière(s) première(s)`}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Link href="/admin/stock/thresholds" className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC] transition-colors">
              Seuils
            </Link>
            <button onClick={() => setShowRestock(true)} className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
              Restocker
            </button>
            <button onClick={() => setShowAssign(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#4CAF4F' }}>
              + Attribuer du stock
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 mb-5 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-0.5"><path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14a1 1 0 00.87 1.5h16.02a1 1 0 00.87-1.5l-8.18-14a1 1 0 00-1.74 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <p className="text-[12px] leading-snug">
          <span className="font-bold">Page en cours de développement.</span> Elle est utilisable au quotidien, mais des ajustements et corrections sont encore en cours — signalez tout comportement inattendu.
        </p>
      </div>

      <div className="flex gap-2 p-1 rounded-lg bg-[#F1F5F9] w-fit mb-5">
        {([['produits', 'Produits finis'], ['matieres', 'Matières premières'], ['commercial', 'Stock par commercial']] as const).map(([val, lbl]) => (
          <button key={val} onClick={() => setTab(val)} className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${tab === val ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#8A9BB5]'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {(tab === 'produits' || tab === 'matieres') && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par référence ou nom..."
          className="mb-4 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[13px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] w-full max-w-xs" />
      )}

      {tab === 'produits' && (
        <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Référence</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Mode</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Disponible</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Réservé</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Total</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Hors commerciaux</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">En retour</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Statut</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id} className="border-b border-[#F0F4F8] last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-bold text-[#0F172A]">{p.reference}</p>
                    {p.name && <p className="text-[11px] text-[#8A9BB5]">{p.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#8A9BB5]">{p.mode === 'ACHETE' ? 'Acheté' : p.mode === 'FABRIQUE' ? 'Fabriqué' : 'Les deux'}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A] text-right tabular-nums">{p.available}</td>
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{p.reserved}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A] text-right tabular-nums">{p.available + p.reserved}</td>
                  {/* Disponible + Réservé (tout ce qui est en entrepôt ou engagé sur une commande)
                      moins ce qui est actuellement chez un commercial (StockAssignment) —
                      jamais négatif à l'affichage (une incohérence de données ne doit jamais
                      remonter un total halluciné). */}
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{Math.max(0, p.available + p.reserved - p.assignedToCommercials)}</td>
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{p.returned}</td>
                  <td className="px-4 py-3">{statusBadge(p.available, p.mode === 'ACHETE' ? p.purchaseThreshold : p.productionThreshold)}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setActionTarget({ type: 'product', item: p, label: p.reference, unit: '', needsMode: p.mode === 'LES_DEUX' })}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">
                        Gérer le stock
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredProducts.length === 0 && !loading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-[13px] text-[#8A9BB5]">Aucun produit.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'matieres' && (
        <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Référence</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Nom</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Disponible</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Réservé</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase text-right">Total</th>
                <th className="px-4 py-3 text-[11px] font-bold text-[#8A9BB5] uppercase">Statut</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map((m) => (
                <tr key={m.id} className="border-b border-[#F0F4F8] last:border-0">
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] tabular-nums">{m.reference}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A]">{m.name}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A] text-right tabular-nums">{m.available} {m.unit}</td>
                  <td className="px-4 py-3 text-[13px] text-[#374151] text-right tabular-nums">{m.reserved} {m.unit}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-[#0F172A] text-right tabular-nums">{m.available + m.reserved} {m.unit}</td>
                  <td className="px-4 py-3">{statusBadge(m.available, m.purchaseThreshold)}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setActionTarget({ type: 'material', item: m, label: m.name, unit: m.unit, needsMode: false })}
                        className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">
                        Gérer le stock
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filteredMaterials.length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-[#8A9BB5]">Aucune matière première. Ajoutez-en une depuis la page Recettes de production.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'commercial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden bg-white">
            {employees.map((e, i) => (
              <button key={e.id} onClick={() => loadEmployeeDetail(e.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors ${i > 0 ? 'border-t border-[#F0F4F8]' : ''} ${selectedEmployee?.id === e.id ? 'bg-[#F0FDF4]' : ''}`}>
                <span className="text-[13px] font-bold text-[#0F172A]">{e.name}</span>
                <span className="text-[12px] font-semibold text-[#8A9BB5]">{e.totalAssigned} unité(s)</span>
              </button>
            ))}
            {employees.length === 0 && !loading && (
              <p className="px-4 py-10 text-center text-[13px] text-[#8A9BB5]">Aucun employé actif.</p>
            )}
          </div>

          <div className="rounded-xl border-2 border-[#E2E8F0] bg-white p-4">
            {!selectedEmployee ? (
              <p className="text-[13px] text-[#8A9BB5] text-center py-10">Sélectionne un employé pour voir le détail.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <h3 className="text-[14px] font-bold text-[#0F172A]">{selectedEmployee.name}</h3>
                {selectedEmployee.lines.length === 0 ? (
                  <p className="text-[13px] text-[#8A9BB5] py-6 text-center">Aucun stock attribué.</p>
                ) : selectedEmployee.lines.map((l) => (
                  <div key={l.assignmentId} className="flex items-center justify-between p-3 rounded-lg border border-[#F0F4F8]">
                    <div>
                      <p className="text-[13px] font-bold text-[#0F172A]">{l.productReference}</p>
                      {l.productName && <p className="text-[11px] text-[#8A9BB5]">{l.productName}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-[#374151] tabular-nums">{l.quantity} unité(s)</span>
                      {canEdit && (
                        <button onClick={() => withdraw(l.assignmentId)} className="text-[12px] font-bold text-[#EF4444] hover:text-[#991B1B]">Retirer</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {actionTarget && (
        <StockActionModal
          label={actionTarget.label} unit={actionTarget.unit} item={actionTarget.item} isProduct={actionTarget.type === 'product'} needsMode={actionTarget.needsMode}
          onClose={() => setActionTarget(null)}
          onRestock={(qty, mode) => doRestock(actionTarget.type, actionTarget.item.id, qty, mode)}
          onCorrection={(field, qty) => doCorrection(actionTarget.type, actionTarget.item.id, field, qty)}
        />
      )}
      {showAssign && (
        <AssignModal employees={employees} products={products} onClose={() => setShowAssign(false)} onSave={saveAssignment} />
      )}
      {showRestock && (
        <RestockOnlyModal products={products} materials={materials} onClose={() => setShowRestock(false)}
          onRestock={(type, id, qty, mode) => doRestock(type, id, qty, mode)} />
      )}
    </div>
  );
}

export default function StockPage() {
  return <RequirePerm perm="voir_stock"><StockPageInner /></RequirePerm>;
}
