'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { RequirePerm } from '@/components/RequirePerm';

type Category = 'CONFIRMATION' | 'DEVIS' | 'LIVRAISON' | 'RELANCE' | 'AUTRE';

interface Template {
  id: string;
  title: string;
  content: string;
  category: Category;
  order: number;
}

const CATEGORIES: { key: Category; label: string; color: string; bg: string }[] = [
  { key: 'CONFIRMATION', label: 'Confirmation', color: '#166534', bg: '#F0FDF4' },
  { key: 'DEVIS',        label: 'Devis',        color: '#5B21B6', bg: '#F5F3FF' },
  { key: 'LIVRAISON',    label: 'Livraison',    color: '#1E40AF', bg: '#EFF6FF' },
  { key: 'RELANCE',      label: 'Relance',      color: '#92400E', bg: '#FFFBEB' },
  { key: 'AUTRE',        label: 'Autre',        color: '#374151', bg: '#F8FAFC' },
];
const catCfg = (c: Category) => CATEGORIES.find((x) => x.key === c) ?? CATEGORIES[4];

const VARIABLES = ['[Nom]', '[Référence]', '[Wilaya]', '[Récapitulatif]', '[Agent]'];

const inputClass = "w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] text-[14px] text-[#0F172A] focus:outline-none focus:border-[#4CAF4F] focus:ring-[3px] focus:ring-[#4CAF4F]/15 transition-all bg-white";

const emptyForm = { title: '', category: 'AUTRE' as Category, content: '' };

function TemplateForm({ form, setForm, onSubmit, onClose, submitLabel }: {
  form: typeof emptyForm; setForm: (f: typeof emptyForm) => void; onSubmit: () => void; onClose: () => void; submitLabel: string;
}) {
  const insertVar = (v: string) => setForm({ ...form, content: form.content + v });
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Titre</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex : Confirmation de commande" className={inputClass} />
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Catégorie</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setForm({ ...form, category: c.key })}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold border-2 transition-all"
              style={form.category === c.key
                ? { background: c.bg, borderColor: c.color, color: c.color }
                : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#8A9BB5' }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-semibold text-[#374151] mb-1.5">Message</label>
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={7}
          placeholder="Bonjour [Nom], ..." className={inputClass + ' resize-none font-mono text-[13px] leading-relaxed'} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[11px] text-[#8A9BB5] font-semibold mr-1">Insérer :</span>
          {VARIABLES.map((v) => (
            <button key={v} onClick={() => insertVar(v)}
              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] transition-colors">{v}</button>
          ))}
        </div>
        <p className="text-[11px] text-[#ABBED1] mt-2">[Récapitulatif] = liste des produits + total. Les variables sont remplacées automatiquement à l&apos;envoi.</p>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-[13px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
        <button onClick={onSubmit} disabled={!form.title.trim() || !form.content.trim()}
          className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] disabled:opacity-60 transition-colors">{submitLabel}</button>
      </div>
    </div>
  );
}

function TemplatesPageInner() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTpl, setEditTpl] = useState<Template | null>(null);
  const [deleteTpl, setDeleteTpl] = useState<Template | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) setTemplates(await res.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleAdd = async () => {
    await fetch('/api/templates', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setShowAdd(false); setForm({ ...emptyForm }); fetchTemplates();
  };

  const handleEdit = async () => {
    if (!editTpl) return;
    await fetch(`/api/templates/${editTpl.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setEditTpl(null); fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteTpl) return;
    await fetch(`/api/templates/${deleteTpl.id}`, { method: 'DELETE' });
    setDeleteTpl(null); fetchTemplates();
  };

  const openEdit = (t: Template) => { setForm({ title: t.title, category: t.category, content: t.content }); setEditTpl(t); };

  // Groupe par catégorie
  const byCat = CATEGORIES.map((c) => ({ ...c, items: templates.filter((t) => t.category === c.key) })).filter((g) => g.items.length > 0);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#0F172A]">Messages types</h1>
          <p className="text-[13px] text-[#8A9BB5] mt-1">Modèles WhatsApp / SMS / Email envoyés aux clients depuis le détail d&apos;une commande ou la fiche client</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setShowAdd(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] transition-colors flex-shrink-0">
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>
          Nouveau modèle
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[13px] text-[#8A9BB5]">Chargement…</div>
      ) : templates.length === 0 ? (
        <div className="py-20 text-center text-[#8A9BB5]">
          <p className="text-[15px] font-semibold">Aucun modèle</p>
          <p className="text-[13px] mt-1">Créez votre premier message type.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {byCat.map((g) => (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: g.bg, color: g.color }}>{g.label}</span>
                <span className="text-[11px] text-[#ABBED1]">{g.items.length} modèle{g.items.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {g.items.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[14px] font-bold text-[#0F172A] leading-tight">{t.title}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => openEdit(t)} title="Modifier"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#374151] hover:bg-[#F0FDF4] transition-colors">
                          <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </button>
                        <button onClick={() => setDeleteTpl(t)} title="Supprimer"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#EF4444] hover:bg-[#FEF2F2] transition-colors">
                          <svg width={14} height={14} fill="none" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#475569] whitespace-pre-line leading-relaxed">{t.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Nouveau modèle" onClose={() => setShowAdd(false)}>
          <TemplateForm form={form} setForm={setForm} onSubmit={handleAdd} onClose={() => setShowAdd(false)} submitLabel="Créer" />
        </Modal>
      )}

      {editTpl && (
        <Modal title="Modifier le modèle" onClose={() => setEditTpl(null)}>
          <TemplateForm form={form} setForm={setForm} onSubmit={handleEdit} onClose={() => setEditTpl(null)} submitLabel="Enregistrer" />
        </Modal>
      )}

      {deleteTpl && (
        <Modal title="Supprimer le modèle" onClose={() => setDeleteTpl(null)}>
          <div className="text-center">
            <p className="text-[14px] font-bold text-[#0F172A] mb-1">Supprimer « {deleteTpl.title} » ?</p>
            <p className="text-[12px] text-[#8A9BB5] mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTpl(null)} className="flex-1 px-4 py-2.5 rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-colors">Annuler</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-colors">Supprimer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  return <RequirePerm perm="modifier_contenu"><TemplatesPageInner /></RequirePerm>;
}
