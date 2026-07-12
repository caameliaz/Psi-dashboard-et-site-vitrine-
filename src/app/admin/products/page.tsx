'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { AdminSelect } from '@/components/ui/AdminSelect';
import { useRole } from '@/lib/role-context';

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
  photo?: string;
}

function dbProductToProduct(p: any): Product {
  return {
    id: p.id,
    reference: p.reference ?? '—',
    largeur: p.width ? `${p.width}mm` : '—',
    longueur: p.length ? `${p.length}m` : '—',
    categorie: p.category?.name ?? 'Standard',
    actif: p.active ?? true,
    photo: p.photo ?? undefined,
  };
}

const emptyForm = { reference: '', largeur: '', longueur: '', categorie: 'Thermique', photo: '' };

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
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm({ ...form, photo: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Photo produit (visible sur le site public) */}
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Photo du produit</label>
        <div className="flex items-center gap-3">
          <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileRef.current?.click()}>
            {form.photo ? (
              <img src={form.photo} alt="Produit" className="w-20 h-20 rounded-xl object-cover border border-[#E2E8F0]" />
            ) : (
              <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-[#F8FAFC] border border-dashed border-[#CBD5E1]">
                <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M4 16l4-4a3 3 0 014 0l4 4M14 14l1-1a3 3 0 014 0l1 1M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10" r="1.5" fill="#94A3B8"/></svg>
              </div>
            )}
            <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-[10px] font-bold">Changer</span>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">
              {form.photo ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {form.photo && (
              <button type="button" onClick={() => setForm({ ...form, photo: '' })}
                className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#EF4444] hover:bg-[#FEF2F2] transition-colors self-start">
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

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
  const { can } = useRole();
  const canEdit = can('modifier_produits');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [catList, setCatList] = useState<{ id: string; name: string; photo: string | null; count: number }[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newCat, setNewCat]     = useState('');
  const catPhotoRef = useRef<Record<string, HTMLInputElement | null>>({});
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterActif, setFilterActif] = useState<'all' | 'actif' | 'inactif'>('all');

  const [showAdd, setShowAdd]           = useState(false);
  const [editProduct, setEditProduct]   = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [addForm, setAddForm]   = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data = await res.json();
      const list = data.map((c: any) => ({ id: c.id, name: c.name, photo: c.photo ?? null, count: c._count?.products ?? 0 }));
      setCatList(list);
      setCategories(list.length ? list.map((c: { name: string }) => c.name) : ['Standard']);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?all=true');
      if (res.ok) {
        const data = await res.json();
        const mapped: Product[] = data.map(dbProductToProduct);
        setProducts(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts, fetchCategories]);

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

  const addCategory = async () => {
    const t = newCat.trim();
    if (!t || categories.includes(t)) return;
    const res = await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: t }),
    });
    if (res.ok) { setNewCat(''); await fetchCategories(); }
  };

  const deleteCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Suppression impossible');
      return;
    }
    await fetchCategories();
  };

  // Upload photo d'une catégorie (image → base64 → PATCH)
  const setCategoryPhoto = async (id: string, file: File | null) => {
    const photo = await new Promise<string>((resolve) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string) ?? '');
      reader.readAsDataURL(file);
    });
    await fetch(`/api/categories/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: photo || null }),
    });
    await fetchCategories();
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
        photo: addForm.photo || null,
      }),
    });
    await fetchProducts();
    setAddForm(emptyForm);
    setShowAdd(false);
  };

  const openEdit = (p: Product) => {
    setEditForm({ reference: p.reference, largeur: p.largeur, longueur: p.longueur, categorie: p.categorie, photo: p.photo ?? '' });
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
        photo: editForm.photo || null,
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
    const res = await fetch(`/api/products/${deleteProduct.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Impossible de supprimer ce produit.");
      return;
    }
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
        {canEdit && (
          <button onClick={() => { setAddForm(emptyForm); setShowAdd(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#4CAF4F' }}>
            + Nouveau produit
          </button>
        )}
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
                  {canEdit && <Toggle active={p.actif} onToggle={() => toggleProduct(p.id)} />}
                </div>

                {/* Actions */}
                {canEdit && (
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
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-[#0F172A] mb-1">Catégories</h2>
        <p className="text-[12px] text-[#8A9BB5] mb-4">La photo s’affiche sur le site public (page produits + accueil).</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {catList.map((cat) => (
            <div key={cat.id} className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
              {/* Zone photo */}
              <div className="relative h-24 bg-[#F5F7FA] flex items-center justify-center">
                {cat.photo ? (
                  <img src={cat.photo} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[11px] text-[#ABBED1]">Aucune photo</span>
                )}
                {canEdit && (
                  <button onClick={() => catPhotoRef.current[cat.id]?.click()}
                    className="absolute bottom-1.5 right-1.5 px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-black/50 hover:bg-black/70 transition-colors">
                    {cat.photo ? 'Changer' : 'Photo'}
                  </button>
                )}
                <input ref={(el) => { catPhotoRef.current[cat.id] = el; }} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0] ?? null; setCategoryPhoto(cat.id, f); e.target.value = ''; }} />
              </div>
              {/* Nom + actions */}
              <div className="flex items-center justify-between gap-1 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#0F172A] truncate">{cat.name}</p>
                  <p className="text-[10px] text-[#8A9BB5]">{cat.count} produit{cat.count > 1 ? 's' : ''}</p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {cat.photo && (
                      <button onClick={() => setCategoryPhoto(cat.id, null)} title="Retirer la photo"
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[#8A9BB5] hover:bg-[#F1F5F9] transition-colors text-xs">⊘</button>
                    )}
                    <button onClick={() => deleteCategory(cat.id)} title="Supprimer la catégorie"
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] transition-colors font-bold leading-none">×</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="Nouvelle catégorie..." className={inputClass} />
            <button onClick={addCategory} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap" style={{ background: '#4CAF4F' }}>+ Ajouter</button>
          </div>
        )}
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
