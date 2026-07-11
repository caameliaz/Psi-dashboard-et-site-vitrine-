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

// Select des communes filtré par wilaya + saisie libre : on peut choisir dans
// la liste OU taper une commune absente de la liste.
export function CommuneSelect({ wilaya, value, onChange, required, name }: CommuneSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const communes = communesForWilaya(wilaya);
  const q = query.toLowerCase();
  const filtered = communes.filter((c) => c.toLowerCase().includes(q));
  // La valeur tapée n'existe pas dans la liste → on propose de la garder telle quelle
  const isFreeText = query.trim() !== '' && !communes.some((c) => c.toLowerCase() === q);

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
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} required={required} />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(''); }}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border bg-white text-[14px] transition-all outline-none ${
          open ? 'border-[#4CAF4F] ring-[3px] ring-[#4CAF4F]/15' : 'border-[#E2E8F0] hover:border-[#ABBED1]'
        } ${value ? 'text-[#263238]' : 'text-[#9CA3AF]'}`}
      >
        <span className="truncate">{value || (wilaya ? 'Sélectionner une commune' : 'Choisir la wilaya d’abord')}</span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white rounded-xl border border-[#E2E8F0] shadow-[0_8px_32px_rgba(171,190,209,0.45)] overflow-hidden">
          {/* Recherche / saisie libre */}
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
                onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { e.preventDefault(); pick(query.trim()); } }}
                placeholder="Rechercher ou saisir…"
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
            {/* Option saisie libre en tête si le texte n'est pas dans la liste */}
            {isFreeText && (
              <li>
                <button type="button" onClick={() => pick(query.trim())}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#4CAF4F] font-semibold hover:bg-[#F0FDF4] transition-colors">
                  Utiliser « {query.trim()} »
                </button>
              </li>
            )}
            {filtered.length === 0 && !isFreeText ? (
              <li className="px-4 py-3 text-[13px] text-[#ABBED1] text-center">
                {wilaya ? 'Aucune commune — tapez pour saisir' : 'Choisissez d’abord une wilaya'}
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
    </div>
  );
}
