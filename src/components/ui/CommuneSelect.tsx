'use client';

import { useState, useRef, useEffect } from 'react';
import { communesForWilaya } from '@/lib/data/wilayas-communes';

interface CommuneSelectProps {
  wilaya: string;              // wilaya sélectionnée (libellé "NN - Nom")
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  name?: string;
}

// Select des communes filtré par wilaya, + petit champ de saisie manuelle en dessous
// pour les communes absentes de la liste.
export function CommuneSelect({ wilaya, value, onChange, required, name }: CommuneSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const communes = communesForWilaya(wilaya);
  const q = query.toLowerCase();
  const filtered = communes.filter((c) => c.toLowerCase().includes(q));
  // La valeur est déjà une saisie manuelle si elle ne correspond à aucune commune de la liste
  const isManualValue = value.trim() !== '' && !communes.some((c) => c.toLowerCase() === value.toLowerCase());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const pick = (c: string) => { onChange(c); setOpen(false); setQuery(''); };

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      <input type="hidden" name={name} value={value} required={required} />

      {/* Dropdown : liste des communes de la wilaya */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border bg-white text-[14px] transition-all outline-none ${
          open ? 'border-[#4CAF4F] ring-[3px] ring-[#4CAF4F]/15' : 'border-[#E2E8F0] hover:border-[#ABBED1]'
        } ${value && !isManualValue ? 'text-[#263238]' : 'text-[#9CA3AF]'}`}
      >
        <span className="truncate">{(value && !isManualValue) ? value : (wilaya ? 'Sélectionner une commune' : 'Choisir la wilaya d’abord')}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_8px_32px_rgba(171,190,209,0.45)] overflow-hidden">
          <div className="p-2 border-b border-[#F0F4F8]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F7FA]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="7" cy="7" r="4.5" stroke="#ABBED1" strokeWidth="1.4"/>
                <path d="M10.5 10.5l2.5 2.5" stroke="#ABBED1" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                className="flex-1 bg-transparent text-[13px] text-[#263238] outline-none placeholder:text-[#ABBED1]"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-[#ABBED1] hover:text-[#263238]">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          <ul className="max-h-[220px] overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-[13px] text-[#ABBED1] text-center">
                {wilaya ? 'Aucune commune trouvée' : 'Choisissez d’abord une wilaya'}
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c}>
                  <button type="button" onClick={() => pick(c)}
                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                      value === c ? 'bg-[#F0FDF4] text-[#4CAF4F] font-semibold' : 'text-[#4D4D4D] hover:bg-[#F5F7FA]'
                    }`}>
                    {c}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Petit champ de saisie manuelle — pour une commune absente de la liste */}
      <input
        type="text"
        value={isManualValue ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={!wilaya}
        placeholder="Ou saisir un nom manuellement…"
        className="w-full px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#263238] placeholder:text-[#ABBED1] outline-none transition-all focus:border-[#4CAF4F] focus:ring-[2px] focus:ring-[#4CAF4F]/15 disabled:bg-[#F5F7FA] disabled:cursor-not-allowed"
      />
    </div>
  );
}
