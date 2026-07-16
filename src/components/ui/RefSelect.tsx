'use client';

import { useState } from 'react';

// Sélecteur de produit (référence) avec recherche — partagé entre les formulaires
// de création de commande/devis (page requests + fiche client).
// allowFree : ajoute une option "Référence libre" (pour les devis hors-catalogue).
export function RefSelect({ value, products, onChange, allowFree = false }: {
  value: string;
  products: { id: string; reference: string; price: number }[];
  onChange: (ref: string, isFree?: boolean) => void;
  allowFree?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [freeMode, setFreeMode] = useState(false);
  const filtered = products.filter(p =>
    !query || p.reference.toLowerCase().includes(query.toLowerCase())
  );

  // Mode saisie libre : champ texte simple
  if (freeMode) {
    return (
      <div className="relative">
        <input
          value={value}
          onChange={e => onChange(e.target.value, true)}
          placeholder="Réf. libre…"
          autoFocus
          className="w-full px-3 py-2 rounded-xl border border-[#4CAF4F] bg-white text-[13px] text-[#0F172A] outline-none pr-7"
        />
        <button type="button" onClick={() => { setFreeMode(false); onChange('', false); }} title="Choisir dans la liste"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ABBED1] hover:text-[#374151]">
          <svg width={12} height={12} fill="none" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-[13px] transition-colors hover:border-[#4CAF4F] focus:outline-none"
        style={{ color: value ? '#0F172A' : '#94A3B8' }}>
        <span className="truncate">{value || '— Réf —'}</span>
        <svg width={12} height={12} fill="none" viewBox="0 0 24 24" className="flex-shrink-0 text-[#ABBED1]" style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-[110] bg-white rounded-xl border border-[#E2E8F0] shadow-xl overflow-hidden" style={{ minWidth: 180 }}>
            <div className="px-3 py-2 border-b border-[#F2F4F7]">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full text-[12px] text-[#0F172A] bg-transparent outline-none placeholder-[#ABBED1]"
              />
            </div>
            <div className="max-h-[180px] overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-[#ABBED1]">Aucun résultat</p>
              ) : filtered.map(p => (
                <button key={p.id} type="button"
                  onClick={() => { onChange(p.reference, false); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-[#F0FDF4] transition-colors group"
                  style={{ background: value === p.reference ? '#F0FDF4' : undefined }}>
                  <span className="text-[13px] font-semibold" style={{ color: value === p.reference ? '#4CAF4F' : '#0F172A' }}>{p.reference}</span>
                  <span className="text-[11px] text-[#ABBED1]">{p.price.toLocaleString('fr-FR')} DA</span>
                </button>
              ))}
            </div>
            {allowFree && (
              <button type="button"
                onClick={() => { setFreeMode(true); setOpen(false); setQuery(''); onChange('', true); }}
                className="w-full text-left px-3 py-2.5 border-t border-[#F2F4F7] flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors">
                <svg width={13} height={13} fill="none" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <span className="text-[12px] font-semibold text-[#8B5CF6]">Référence libre…</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
