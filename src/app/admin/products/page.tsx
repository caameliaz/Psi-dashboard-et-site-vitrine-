'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AdminSelect } from '@/components/ui/AdminSelect';

function IconPencil() {
  return (
    <svg width={15} height={15} fill="none">
      <path d="M10.5 1.5L12.5 3.5L6 10L3.5 10.5L4 8L10.5 1.5Z" stroke="#8A9BB5" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M0.75 13.25H13.25" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width={15} height={15} fill="none">
      <path d="M1.5 3.5H12.5" stroke="#EF4444" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M5 3.5V2.5C5 1.95 5.45 1.5 6 1.5H8C8.55 1.5 9 1.95 9 2.5V3.5" stroke="#EF4444" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M2.5 3.5L3 12C3 12.55 3.45 13 4 13H10C10.55 13 11 12.55 11 12L11.5 3.5" stroke="#EF4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

function Toggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 rounded-full transition-colors duration-200"
      style={{ width: 44, height: 26, background: active ? '#4CAF4F' : '#D0D5DD' }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ transform: active ? 'translateX(18px)' : 'translateX(0px)' }}
      />
    </button>
  );
}

interface Product {
  id: string;
  reference: string;
  largeur: string;
  longueur: string;
  categorie: string;
  actif: boolean;
}

function dbProductToProduct(p: any): Product {
  return {
    id: p.id,
    reference: p.reference ?? '—',
    largeur: p.width ? `${p.width}mm` : '—',
    longueur: p.length ? `${p.length}m` : '—',
    categorie: p.category?.name ?? 'Standard',
    actif: p.active ?? true,
  };
}

const emptyForm = { reference: '', largeur: '', longueur: '', categorie: 'Thermique' };

function ProductForm({
  form, setForm, categories, onSubmit, onClose, submitLabel,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  categories: string[];
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
}) {
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";
  return (
    <div className="space-y-4">
      {[
        { label: 'Référence', key: 'reference', placeholder: 'ex: 80/80' },
        { label: 'Largeur', key: 'largeur', placeholder: 'ex: 80mm' },
        { label: 'Longueur', key: 'longueur', placeholder: 'ex: 80m' },
      ].map(({ label, key, placeholder }) => (
        <div key={key}>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">{label}</label>
          <input value={form[key as keyof typeof emptyForm]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} className={inputClass} />
        </div>
      ))}
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Catégorie</label>
        <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className={inputClass}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
        <button onClick={onSubmit} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>{submitLabel}</button>
      </div>
    </div>
  );
}

function DeleteModal({ product, onDeactivate, onDelete, onClose }: {
  product: Product;
  onDeactivate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'choice' | 'confirm'>('choice');

  if (step === 'confirm') {
    return (
      <Modal title="Suppression définitive" onClose={onClose}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <svg width={22} height={22} fill="none" viewBox="0 0 24 24">
              <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-[14px] font-bold text-[#0F172A] mb-1">Supprimer <span className="text-[#EF4444]">{product.reference}</span> ?</p>
          <p className="text-[12px] text-[#8A9BB5] mb-5">Cette action est irréversible. Le produit sera effacé définitivement.</p>
          <div className="flex gap-3">
            <button onClick={() => setStep('choice')} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Retour</button>
            <button onClick={onDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-colors">Supprimer</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Que voulez-vous faire ?" onClose={onClose}>
      <p className="text-[13px] text-[#8A9BB5] mb-5">Produit : <span className="font-semibold text-[#0F172A]">{product.reference}</span></p>
      <div className="flex flex-col gap-3">
        <button onClick={onDeactivate} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#92400E]">Désactiver</p>
          <p className="text-[11px] text-[#8A9BB5]">Le produit reste en historique mais n&apos;est plus visible sur le site</p>
        </button>
        <button onClick={() => setStep('confirm')} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#991B1B]">Supprimer définitivement</p>
          <p className="text-[11px] text-[#8A9BB5]">Efface le produit de la base de données — irréversible</p>
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-[#8A9BB5] hover:text-[#374151] transition-colors">Annuler</button>
      </div>
    </Modal>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newCat, setNewCat]     = useState('');
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterActif, setFilterActif] = useState<'all' | 'actif' | 'inactif'>('all');

  const [showAdd, setShowAdd]           = useState(false);
  const [editProduct, setEditProduct]   = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [addForm, setAddForm]   = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?all=true');
      if (res.ok) {
        const data = await res.json();
        const mapped: Product[] = data.map(dbProductToProduct);
        setProducts(mapped);
        const cats = [...new Set(mapped.map((p) => p.categorie))];
        setCategories(cats.length ? cats : ['Standard']);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleProduct = async (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !p.actif }),
    });
    await fetchProducts();
  };

  const addCategory = () => {
    const t = newCat.trim();
    if (t && !categories.includes(t)) { setCategories((p) => [...p, t]); setNewCat(''); }
  };

  const handleAdd = async () => {
    if (!addForm.reference.trim()) return;
    const widthStr  = addForm.largeur.replace('mm', '').trim();
    const lengthStr = addForm.longueur.replace('m', '').trim();
    // Récupérer categoryId via /api/categories
    const catRes = await fetch('/api/categories');
    const cats   = catRes.ok ? await catRes.json() : [];
    const cat    = cats.find((c: any) => c.name === addForm.categorie) ?? cats[0];
    if (!cat) return;
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: addForm.reference.trim(),
        width: widthStr ? Number(widthStr) : 0,
        length: lengthStr ? Number(lengthStr) : 0,
        usage: '',
        price: 0,
        categoryId: cat.id,
        active: true,
      }),
    });
    await fetchProducts();
    setAddForm(emptyForm);
    setShowAdd(false);
  };

  const openEdit = (p: Product) => {
    setEditForm({ reference: p.reference, largeur: p.largeur, longueur: p.longueur, categorie: p.categorie });
    setEditProduct(p);
  };

  const handleEdit = async () => {
    if (!editProduct) return;
    const widthStr  = editForm.largeur.replace('mm', '').trim();
    const lengthStr = editForm.longueur.replace('m', '').trim();
    await fetch(`/api/products/${editProduct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference: editForm.reference.trim(),
        width: widthStr ? Number(widthStr) : undefined,
        length: lengthStr ? Number(lengthStr) : undefined,
      }),
    });
    await fetchProducts();
    setEditProduct(null);
  };

  const handleDeactivate = async () => {
    if (!deleteProduct) return;
    await fetch(`/api/products/${deleteProduct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    });
    await fetchProducts();
    setDeleteProduct(null);
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;
    await fetch(`/api/products/${deleteProduct.id}`, { method: 'DELETE' });
    await fetchProducts();
    setDeleteProduct(null);
  };

  const inputClass = "px-3 py-2 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] placeholder-[#8A9BB5] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors";

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.reference.toLowerCase().includes(q) || p.categorie.toLowerCase().includes(q);
    const matchCat = filterCat === 'all' || p.categorie === filterCat;
    const matchActif = filterActif === 'all' || (filterActif === 'actif' ? p.actif : !p.actif);
    return matchSearch && matchCat && matchActif;
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Produits</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">{loading ? 'Chargement…' : `${filteredProducts.length} produit${filteredProducts.length !== 1 ? 's' : ''}`}</p>
        </div>
        <button onClick={() => { setAddForm(emptyForm); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#4CAF4F' }}>
          + Nouveau produit
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width={14} height={14} fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#8A9BB5" strokeWidth="1.4"/>
            <path d="M10 10L13 13" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.4"/>
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher reference..." className={inputClass + " pl-8 w-[200px]"} />
        </div>
        <AdminSelect
          value={filterCat}
          onChange={setFilterCat}
          options={[{ value: 'all', label: 'Toutes catégories' }, ...categories.map((c) => ({ value: c, label: c }))]}
        />
        <AdminSelect
          value={filterActif}
          onChange={(v) => setFilterActif(v as typeof filterActif)}
          options={[{ value: 'all', label: 'Actif + Inactif' }, { value: 'actif', label: 'Actifs seulement' }, { value: 'inactif', label: 'Inactifs seulement' }]}
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 text-[#8A9BB5] mb-8">
          <p className="text-[15px] font-semibold">Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)] transition-all flex flex-col overflow-hidden"
              style={{ opacity: p.actif ? 1 : 0.5 }}
            >
              {/* Visuel rouleau (identique site public) */}
              <div className="bg-[#F5F7FA] h-36 flex items-center justify-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                  <div className="absolute inset-[15%] rounded-full bg-[#C8E6C9] border-[1.5px] border-[#4CAF4F]" />
                  <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
                  <div className="absolute inset-[43%] rounded-full bg-white" />
                </div>
              </div>

              {/* Infos */}
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <h3 className="text-[16px] font-semibold text-[#263238]">Réf. {p.reference}</h3>
                  <p className="text-[13px] font-medium text-[#4D4D4D]">{p.largeur} × {p.longueur}</p>
                  <p className="text-[12px] text-[#8A9BB5] mt-0.5">{p.categorie}</p>
                </div>

                {/* Toggle actif */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F2F4F7]">
                  <span className="text-[12px] font-semibold" style={{ color: p.actif ? '#4CAF4F' : '#9CA3AF' }}>
                    {p.actif ? 'Actif' : 'Inactif'}
                  </span>
                  <Toggle active={p.actif} onToggle={() => toggleProduct(p.id)} />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#E2E8F0] hover:border-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors"
                  >
                    <IconPencil />
                    <span className="text-[12px] font-semibold text-[#8A9BB5]">Modifier</span>
                  </button>
                  <button
                    onClick={() => setDeleteProduct(p)}
                    className="flex items-center justify-center w-9 rounded-lg border border-[#E2E8F0] hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-[#0F172A] mb-4">Catégories</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <span key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-[#F0FDF4] text-[#166534]">
              {cat}
              <button onClick={() => setCategories((p) => p.filter((c) => c !== cat))} className="w-5 h-5 flex items-center justify-center rounded-full text-[#4CAF4F] hover:bg-[#DCFCE7] hover:text-[#991B1B] transition-colors font-bold text-base leading-none">×</button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="Nouvelle catégorie..." className={inputClass} />
          <button onClick={addCategory} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#4CAF4F' }}>+ Ajouter</button>
        </div>
      </div>

      {showAdd && (
        <Modal title="Nouveau produit" onClose={() => setShowAdd(false)}>
          <ProductForm form={addForm} setForm={setAddForm} categories={categories} onSubmit={handleAdd} onClose={() => setShowAdd(false)} submitLabel="Ajouter" />
        </Modal>
      )}
      {editProduct && (
        <Modal title="Modifier le produit" onClose={() => setEditProduct(null)}>
          <ProductForm form={editForm} setForm={setEditForm} categories={categories} onSubmit={handleEdit} onClose={() => setEditProduct(null)} submitLabel="Enregistrer" />
        </Modal>
      )}
      {deleteProduct && (
        <DeleteModal product={deleteProduct} onDeactivate={handleDeactivate} onDelete={handleDelete} onClose={() => setDeleteProduct(null)} />
      )}
    </div>
  );
}
