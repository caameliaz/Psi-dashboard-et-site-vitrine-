'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useRole } from '@/lib/role-context';
import { RequirePerm } from '@/components/RequirePerm';

function IconPencil() {
  return (
    <svg width={14} height={14} fill="none">
      <path d="M10.5 1.5L12.5 3.5L6 10L3.5 10.5L4 8L10.5 1.5Z" stroke="#8A9BB5" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M0.75 13.25H13.25" stroke="#8A9BB5" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width={14} height={14} fill="none">
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
      style={{ width: 40, height: 24, background: active ? '#4CAF4F' : '#D0D5DD' }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all duration-200"
        style={{ transform: active ? 'translateX(16px)' : 'translateX(0px)' }}
      />
    </button>
  );
}

interface Ref {
  id: string;
  reference: string;
  name: string;
  width: number;
  length: number;
  metrage: number | null;
  usage: string;
  price: number;
  active: boolean;
  categoryId: string;
}

interface Cat {
  id: string;
  name: string;
  prefix: string | null;
  photo: string | null;
  description: string | null;
  count: number;
}

function dbToRef(p: any): Ref {
  return {
    id: p.id,
    reference: p.reference ?? '—',
    name: p.name ?? '',
    width: p.width ?? 0,
    length: p.length ?? 0,
    metrage: p.metrage ?? null,
    usage: p.usage ?? '',
    price: p.price ?? 0,
    active: p.active ?? true,
    categoryId: p.categoryId ?? p.category?.id ?? '',
  };
}

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-1 focus:ring-[#4CAF4F] transition-colors bg-[#F8FAFC]";

// ── Modale "Nouvelle référence" — pour la catégorie sélectionnée ────────────
interface RefForm { name: string; width: string; length: string; metrage: string; usage: string; price: string; }
const emptyRefForm: RefForm = { name: '', width: '', length: '', metrage: '', usage: '', price: '' };

function RefFormFields({ form, setForm }: { form: RefForm; setForm: (f: RefForm) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nom de la référence <span className="text-[#ABBED1] font-normal">(facultatif)</span></label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Rouleau thermique 80×80" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Largeur (mm)</label>
          <input value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} placeholder="ex: 80" className={inputClass} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Diamètre (mm)</label>
          <input value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} placeholder="ex: 80" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Métrage (m) <span className="text-[#ABBED1] font-normal">(facultatif)</span></label>
          <input value={form.metrage} onChange={(e) => setForm({ ...form, metrage: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" placeholder="ex: 80" className={inputClass} />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Prix (DA)</label>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="numeric" placeholder="ex: 150" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Utilisation</label>
        <input value={form.usage} onChange={(e) => setForm({ ...form, usage: e.target.value })} placeholder="ex: Caisses enregistreuses" className={inputClass} />
      </div>
    </div>
  );
}

// ── Modale "Que voulez-vous faire ?" (désactiver / supprimer) ───────────────
function DeleteModal({ label, onDeactivate, onDelete, onClose }: {
  label: string;
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
          <p className="text-[14px] font-bold text-[#0F172A] mb-1">Supprimer <span className="text-[#EF4444]">{label}</span> ?</p>
          <p className="text-[12px] text-[#8A9BB5] mb-5">Cette action est irréversible.</p>
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
      <p className="text-[13px] text-[#8A9BB5] mb-5">Référence : <span className="font-semibold text-[#0F172A]">{label}</span></p>
      <div className="flex flex-col gap-3">
        <button onClick={onDeactivate} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#F59E0B] hover:bg-[#FFFBEB] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#92400E]">Désactiver</p>
          <p className="text-[11px] text-[#8A9BB5]">Reste en historique mais n&apos;est plus visible sur le site</p>
        </button>
        <button onClick={() => setStep('confirm')} className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-left hover:border-[#EF4444] hover:bg-[#FEF2F2] transition-all group">
          <p className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#991B1B]">Supprimer définitivement</p>
          <p className="text-[11px] text-[#8A9BB5]">Efface la référence de la base — irréversible</p>
        </button>
        <button onClick={onClose} className="px-4 py-2 text-sm text-[#8A9BB5] hover:text-[#374151] transition-colors">Annuler</button>
      </div>
    </Modal>
  );
}

// ── Modale "Nouveau produit" — crée une catégorie + ses références ─────────
interface NewCatForm { name: string; prefix: string; photo: string; description: string; refs: RefForm[]; }
const emptyNewCatForm: NewCatForm = { name: '', prefix: '', photo: '', description: '', refs: [{ ...emptyRefForm }] };

function NewCategoryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (catId: string) => void }) {
  const [form, setForm] = useState<NewCatForm>(emptyNewCatForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const setRef = (i: number, patch: Partial<RefForm>) =>
    setForm((f) => ({ ...f, refs: f.refs.map((r, idx) => idx === i ? { ...r, ...patch } : r) }));
  const addRef = () => setForm((f) => ({ ...f, refs: [...f.refs, { ...emptyRefForm }] }));
  const removeRef = (i: number) => setForm((f) => ({ ...f, refs: f.refs.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const catRes = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), prefix: form.prefix.trim() || null, photo: form.photo || null, description: form.description.trim() || null }),
      });
      if (!catRes.ok) {
        const err = await catRes.json().catch(() => ({}));
        alert(err.error ?? 'Impossible de créer la catégorie');
        return;
      }
      const cat = await catRes.json();

      const validRefs = form.refs.filter((r) => r.width.trim() && r.length.trim());
      const refResults = await Promise.all(validRefs.map((r) => fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Préfixe défini → réf auto-générée côté API (PTT-001…). Sinon = dimensions.
          reference: form.prefix.trim() ? undefined : `${r.width.trim()}/${r.length.trim()}`,
          name: r.name.trim() || null,
          width: Number(r.width), length: Number(r.length),
          metrage: r.metrage.trim() ? Number(r.metrage) : null,
          usage: r.usage.trim(), price: Number(r.price) || 0, categoryId: cat.id, active: true,
        }),
      })));
      const failedCount = refResults.filter((r) => !r.ok).length;
      if (failedCount > 0) {
        alert(`Catégorie créée, mais ${failedCount} référence(s) n'ont pas pu être ajoutée(s). Vous pourrez les ajouter via "Nouvelle référence".`);
      }

      onCreated(cat.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nouveau produit" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Photo catégorie */}
        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Photo de la catégorie</label>
          <div className="flex items-center gap-3">
            <div className="relative group flex-shrink-0 cursor-pointer" onClick={() => fileRef.current?.click()}>
              {form.photo ? (
                <img src={form.photo} alt="Catégorie" className="w-20 h-20 rounded-xl object-cover border border-[#E2E8F0]" />
              ) : (
                <div className="w-20 h-20 rounded-xl flex items-center justify-center bg-[#F8FAFC] border border-dashed border-[#CBD5E1]">
                  <svg width={22} height={22} fill="none" viewBox="0 0 24 24"><path d="M4 16l4-4a3 3 0 014 0l4 4M14 14l1-1a3 3 0 014 0l1 1M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8.5" cy="10" r="1.5" fill="#94A3B8"/></svg>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">
              {form.photo ? 'Changer' : 'Ajouter une photo'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Nom de la catégorie</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex: Papier thermique standard" className={inputClass} />
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Préfixe des références <span className="text-[#ABBED1] font-normal">(facultatif)</span></label>
          <input value={form.prefix} onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="ex: PTT" maxLength={6} className={inputClass} />
          <p className="text-[11px] text-[#8A9BB5] mt-1">Si défini, chaque référence reçoit un code auto : {form.prefix.trim() ? `${form.prefix.trim()}-001, ${form.prefix.trim()}-002…` : 'PTT-001, PTT-002…'}</p>
        </div>

        <div>
          <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
            placeholder="Description affichée sur le site public" className={inputClass + ' resize-none'} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[12px] font-semibold text-[#374151]">Références</label>
            <button type="button" onClick={addRef} className="text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C]">+ Ajouter une référence</button>
          </div>
          <div className="flex flex-col gap-3">
            {form.refs.map((r, i) => (
              <div key={i} className="rounded-xl border border-[#E2E8F0] p-3 relative">
                {form.refs.length > 1 && (
                  <button type="button" onClick={() => removeRef(i)} title="Retirer"
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] text-xs font-bold">×</button>
                )}
                <RefFormFields form={r} setForm={(nf) => setRef(i, nf)} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-60" style={{ background: '#4CAF4F' }}>
            {saving ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ProductsPageInner() {
  const { can } = useRole();
  const canEdit = can('modifier_produits');
  // Mode édition explicite : même avec la permission, il faut cliquer "Modifier"
  // avant de pouvoir toucher aux toggles / actions (évite les clics accidentels).
  const [editMode, setEditMode] = useState(false);

  const [refs, setRefs] = useState<Ref[]>([]);
  const [catList, setCatList] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterActif, setFilterActif] = useState<'all' | 'actif' | 'inactif'>('all');

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewRef, setShowNewRef] = useState(false);
  const [newRefForm, setNewRefForm] = useState<RefForm>(emptyRefForm);
  const [editRef, setEditRef] = useState<Ref | null>(null);
  const [editRefForm, setEditRefForm] = useState<RefForm>(emptyRefForm);
  const [deleteRef, setDeleteRef] = useState<Ref | null>(null);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [prefixDraft, setPrefixDraft] = useState('');
  const catPhotoRef = useRef<HTMLInputElement>(null);

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/categories');
    if (res.ok) {
      const data = await res.json();
      const list: Cat[] = data.map((c: any) => ({ id: c.id, name: c.name, prefix: c.prefix ?? null, photo: c.photo ?? null, description: c.description ?? null, count: c._count?.products ?? 0 }));
      setCatList(list);
      setSelectedCatId((cur) => cur && list.some((c) => c.id === cur) ? cur : (list[0]?.id ?? null));
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?all=true');
      if (res.ok) {
        const data = await res.json();
        setRefs(data.map(dbToRef));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); fetchCategories(); }, [fetchProducts, fetchCategories]);

  const selectedCat = useMemo(() => catList.find((c) => c.id === selectedCatId) ?? null, [catList, selectedCatId]);

  const catRefs = useMemo(() => refs.filter((r) => r.categoryId === selectedCatId), [refs, selectedCatId]);
  const filteredRefs = catRefs.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.reference.toLowerCase().includes(q) || r.usage.toLowerCase().includes(q);
    const matchActif = filterActif === 'all' || (filterActif === 'actif' ? r.active : !r.active);
    return matchSearch && matchActif;
  });

  const toggleRef = async (r: Ref) => {
    await fetch(`/api/products/${r.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !r.active }),
    });
    await fetchProducts();
  };

  // Active / désactive TOUTE la catégorie (toutes ses références) d'un coup
  const toggleCategory = async () => {
    if (!selectedCat) return;
    const anyActive = catRefs.some((r) => r.active);
    const target = !anyActive; // si au moins une active → on désactive tout ; sinon on réactive tout
    const verbe = target ? 'réactiver' : 'désactiver';
    if (!window.confirm(`Êtes-vous sûr de vouloir ${verbe} TOUTE la catégorie « ${selectedCat.name} » (${catRefs.length} référence${catRefs.length > 1 ? 's' : ''}) ?`)) return;
    await Promise.all(catRefs.map((r) =>
      fetch(`/api/products/${r.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: target }),
      })
    ));
    await fetchProducts();
  };

  const openEditRef = (r: Ref) => {
    setEditRefForm({ name: r.name ?? '', width: String(r.width), length: String(r.length), metrage: r.metrage != null ? String(r.metrage) : '', usage: r.usage, price: String(r.price) });
    setEditRef(r);
  };

  const handleEditRef = async () => {
    if (!editRef) return;
    const res = await fetch(`/api/products/${editRef.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Catégorie avec préfixe → on ne touche PAS au code auto (PTT-001). Sinon réf = dimensions.
        ...(selectedCat?.prefix ? {} : { reference: `${editRefForm.width.trim()}/${editRefForm.length.trim()}` }),
        name: editRefForm.name.trim() || null,
        width: Number(editRefForm.width), length: Number(editRefForm.length),
        metrage: editRefForm.metrage.trim() ? Number(editRefForm.metrage) : null,
        usage: editRefForm.usage.trim(), price: Number(editRefForm.price) || 0,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Impossible de modifier cette référence.');
      return;
    }
    await fetchProducts();
    setEditRef(null);
  };

  const handleCreateRef = async () => {
    if (!selectedCatId || !newRefForm.width.trim() || !newRefForm.length.trim()) return;
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Préfixe défini → réf auto-générée côté API. Sinon = dimensions.
        reference: selectedCat?.prefix ? undefined : `${newRefForm.width.trim()}/${newRefForm.length.trim()}`,
        name: newRefForm.name.trim() || null,
        width: Number(newRefForm.width), length: Number(newRefForm.length),
        metrage: newRefForm.metrage.trim() ? Number(newRefForm.metrage) : null,
        usage: newRefForm.usage.trim(), price: Number(newRefForm.price) || 0, categoryId: selectedCatId, active: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Impossible de créer cette référence.');
      return;
    }
    await fetchProducts();
    await fetchCategories();
    setNewRefForm(emptyRefForm);
    setShowNewRef(false);
  };

  const handleDeactivateRef = async () => {
    if (!deleteRef) return;
    await fetch(`/api/products/${deleteRef.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false }),
    });
    await fetchProducts();
    setDeleteRef(null);
  };

  const handleDeleteRef = async () => {
    if (!deleteRef) return;
    const res = await fetch(`/api/products/${deleteRef.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Impossible de supprimer cette référence.');
      return;
    }
    await fetchProducts();
    await fetchCategories();
    setDeleteRef(null);
  };

  const startEditDesc = () => { setDescDraft(selectedCat?.description ?? ''); setPrefixDraft(selectedCat?.prefix ?? ''); setEditingDesc(true); };
  const saveDesc = async () => {
    if (!selectedCatId) return;
    const res = await fetch(`/api/categories/${selectedCatId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: descDraft.trim() || null, prefix: prefixDraft.trim() || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Impossible d\'enregistrer la description.');
      return;
    }
    await fetchCategories();
    setEditingDesc(false);
  };

  const setCatPhoto = async (file: File | null) => {
    if (!selectedCatId) return;
    const photo = await new Promise<string>((resolve) => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = (ev) => resolve((ev.target?.result as string) ?? '');
      reader.readAsDataURL(file);
    });
    const res = await fetch(`/api/categories/${selectedCatId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: photo || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Impossible d\'enregistrer la photo.');
      return;
    }
    await fetchCategories();
  };

  const deleteCategory = async () => {
    if (!selectedCatId) return;
    if (!window.confirm(`Supprimer la catégorie "${selectedCat?.name}" ?`)) return;
    const res = await fetch(`/api/categories/${selectedCatId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Suppression impossible');
      return;
    }
    setSelectedCatId(null);
    await fetchCategories();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Produits</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-0.5">
            {loading ? 'Chargement…' : `${catList.length} catégorie${catList.length !== 1 ? 's' : ''} · ${refs.length} référence${refs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {/* Bouton mode édition : tant qu'il n'est pas actif, les actions sont verrouillées */}
            <button onClick={() => setEditMode((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                editMode
                  ? 'border-[#4CAF4F] bg-[#4CAF4F] text-white hover:bg-[#43A047]'
                  : 'border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC]'
              }`}>
              {editMode ? '✓ Terminer' : '✎ Modifier'}
            </button>
            {editMode && selectedCatId && (
              <button onClick={() => { setNewRefForm(emptyRefForm); setShowNewRef(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#F0FDF4] transition-colors">
                + Nouvelle référence
              </button>
            )}
            {editMode && (
              <button onClick={() => setShowNewCategory(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: '#4CAF4F' }}>
                + Nouveau produit
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Catégories — colonne verticale à gauche */}
        {catList.length > 0 && (
          <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-visible flex-shrink-0 lg:w-[120px]">
            {catList.map((cat) => {
              const isSelected = cat.id === selectedCatId;
              return (
                <button key={cat.id} onClick={() => setSelectedCatId(cat.id)} className="flex-shrink-0 w-[120px] flex flex-col items-center gap-2 group">
                  <div
                    className="w-[110px] h-[110px] rounded-2xl overflow-hidden bg-[#F5F7FA] border-2 flex items-center justify-center transition-all duration-200"
                    style={{
                      borderColor: isSelected ? '#4CAF4F' : 'transparent',
                      boxShadow: isSelected ? '0 8px 24px rgba(76,175,79,0.35)' : '0 2px 10px rgba(171,190,209,0.35)',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 8px 24px rgba(171,190,209,0.5)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.boxShadow = '0 2px 10px rgba(171,190,209,0.35)'; }}
                  >
                    {cat.photo ? (
                      <img src={cat.photo} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="relative w-10 h-10">
                        <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                        <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
                      </div>
                    )}
                  </div>
                  <span className="text-[12px] font-semibold text-center truncate w-full" style={{ color: isSelected ? '#4CAF4F' : '#374151' }}>
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Détail catégorie sélectionnée : description + refs (gauche) / photo (droite) */}
        {selectedCat && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 mb-8 flex-1 w-full">
          {/* Gauche : description puis références */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-[#E2E8F0] p-5 bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-bold text-[#0F172A]">{selectedCat.name}</h2>
                  {selectedCat.prefix && (
                    <span className="px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] text-[11px] font-bold tracking-wide">{selectedCat.prefix}</span>
                  )}
                </div>
                {canEdit && editMode && !editingDesc && (
                  <button onClick={startEditDesc} className="flex items-center gap-1 text-[12px] font-bold text-[#4CAF4F] hover:text-[#388E3C]">
                    <IconPencil /> Modifier
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#374151] mb-1">Préfixe des références <span className="text-[#ABBED1] font-normal">(facultatif — ex: PTT)</span></label>
                    <input value={prefixDraft} onChange={(e) => setPrefixDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} placeholder="ex: PTT" className={inputClass} />
                  </div>
                  <textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} rows={4} className={inputClass + ' resize-none'} />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingDesc(false)} className="flex-1 px-3 py-2 rounded-lg border border-[#E2E8F0] text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC]">Annuler</button>
                    <button onClick={saveDesc} className="flex-1 px-3 py-2 rounded-lg text-[12px] font-bold text-white" style={{ background: '#4CAF4F' }}>Enregistrer</button>
                  </div>
                </div>
              ) : (
                <p className="text-[14px] text-[#4D4D4D] leading-relaxed">{selectedCat.description || 'Aucune description.'}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-[13px] font-bold text-[#0F172A]">Références ({filteredRefs.length})</h3>
                <div className="flex items-center gap-2">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..."
                    className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] w-[140px]" />
                  <select value={filterActif} onChange={(e) => setFilterActif(e.target.value as typeof filterActif)}
                    className="px-2 py-1.5 rounded-lg border border-[#E2E8F0] text-[12px] text-[#374151] focus:outline-none">
                    <option value="all">Tous</option>
                    <option value="actif">Actifs</option>
                    <option value="inactif">Inactifs</option>
                  </select>
                </div>
              </div>

              {filteredRefs.length === 0 ? (
                <p className="text-[13px] text-[#8A9BB5] py-6 text-center">Aucune référence.</p>
              ) : (
                <div className="rounded-xl border-2 border-[#E2E8F0] overflow-hidden bg-white">
                  {filteredRefs.map((r, i) => (
                    <div key={r.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#E2E8F0]' : ''}`} style={{ opacity: r.active ? 1 : 0.55 }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Code référence (auto PTT-001 si préfixe, sinon dimensions) */}
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] tabular-nums">{r.reference}</span>
                          <p className="text-[13px] font-bold text-[#0F172A] truncate">{r.name || `${r.width}mm × ${r.length}m`}</p>
                        </div>
                        <p className="text-[12px] text-[#8A9BB5] truncate mt-0.5">
                          {r.width}mm × {r.length}m{r.metrage != null ? ` · ${r.metrage} m` : ''}{r.usage ? ` — ${r.usage}` : ''}
                        </p>
                      </div>
                      <p className="text-[13px] font-semibold text-[#374151] flex-shrink-0 tabular-nums">{r.price.toLocaleString('fr-FR')} DA</p>
                      {canEdit && editMode && <Toggle active={r.active} onToggle={() => toggleRef(r)} />}
                      {canEdit && editMode && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEditRef(r)} title="Modifier" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F0FDF4] transition-colors">
                            <IconPencil />
                          </button>
                          <button onClick={() => setDeleteRef(r)} title="Supprimer" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#FEF2F2] transition-colors">
                            <IconTrash />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Droite : photo */}
          <div className="flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden bg-[#F5F7FA] h-[340px] md:h-[420px] flex items-center justify-center">
              {selectedCat.photo ? (
                <img src={selectedCat.photo} alt={selectedCat.name} className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                  <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
                </div>
              )}
              {canEdit && editMode && (
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {selectedCat.photo && (
                    <button onClick={() => setCatPhoto(null)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#EF4444]/80 hover:bg-[#DC2626] transition-colors">
                      Retirer la photo
                    </button>
                  )}
                  <button onClick={() => catPhotoRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-black/50 hover:bg-black/70 transition-colors">
                    {selectedCat.photo ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                </div>
              )}
              <input ref={catPhotoRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0] ?? null; setCatPhoto(f); e.target.value = ''; }} />
            </div>
            {canEdit && editMode && catRefs.length > 0 && (
              <button onClick={toggleCategory} className="self-end text-[12px] font-semibold text-[#B45309] hover:text-[#92400E] transition-colors">
                {catRefs.some((r) => r.active) ? 'Désactiver toute la catégorie' : 'Réactiver toute la catégorie'}
              </button>
            )}
            {canEdit && editMode && (
              <button onClick={deleteCategory} className="self-end text-[12px] font-semibold text-[#EF4444] hover:text-[#991B1B] transition-colors">
                Supprimer cette catégorie
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {catList.length === 0 && !loading && (
        <div className="text-center py-20 text-[#8A9BB5]">
          <p className="text-[15px] font-semibold">Aucune catégorie de produit</p>
          <p className="text-[13px] mt-1">Commencez par créer un nouveau produit.</p>
        </div>
      )}

      {showNewCategory && (
        <NewCategoryModal
          onClose={() => setShowNewCategory(false)}
          onCreated={async (catId) => {
            await fetchCategories();
            await fetchProducts();
            setSelectedCatId(catId);
            setShowNewCategory(false);
          }}
        />
      )}

      {showNewRef && (
        <Modal title="Nouvelle référence" onClose={() => setShowNewRef(false)}>
          <div className="space-y-4">
            <RefFormFields form={newRefForm} setForm={setNewRefForm} />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNewRef(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
              <button onClick={handleCreateRef} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>Ajouter</button>
            </div>
          </div>
        </Modal>
      )}

      {editRef && (
        <Modal title="Modifier la référence" onClose={() => setEditRef(null)}>
          <div className="space-y-4">
            <RefFormFields form={editRefForm} setForm={setEditRefForm} />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditRef(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
              <button onClick={handleEditRef} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors" style={{ background: '#4CAF4F' }}>Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {deleteRef && (
        <DeleteModal label={deleteRef.reference} onDeactivate={handleDeactivateRef} onDelete={handleDeleteRef} onClose={() => setDeleteRef(null)} />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return <RequirePerm perm="voir_produits"><ProductsPageInner /></RequirePerm>;
}
