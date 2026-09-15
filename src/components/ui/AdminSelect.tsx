'use client';

import { useRef, useState, useEffect } from 'react';

interface Option { value: string; label: string; }

interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export function AdminSelect({ value, onChange, options, className = '' }: AdminSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Quand l'appelant impose w-full (grille serrée), on ne force pas la largeur mini.
  const fullWidth = className.includes('w-full');

  const selected = options.find((o) => o.value === value);

  // Sur desktop : clic en dehors du menu = fermeture (comportement dropdown classique).
  // Sur mobile, le menu devient une pop-up centrée avec son propre overlay qui gère déjà
  // la fermeture au clic à côté — ce handler-ci ne doit alors pas interférer, mais comme
  // le menu mobile est rendu DANS le même DOM que le bouton (ref.current le contient),
  // il n'y a pas de conflit : un tap sur l'overlay mobile est hors de `ref`.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-1 px-2.5 md:px-4 py-2.5 rounded-xl border bg-white text-[13px] md:text-[14px] text-[#263238] transition-all outline-none w-full ${
          fullWidth ? '' : 'sm:w-auto sm:min-w-[150px]'
        } ${
          open
            ? 'border-[#4CAF4F] ring-[3px] ring-[#4CAF4F]/15'
            : 'border-[#E2E8F0] hover:border-[#ABBED1]'
        }`}
      >
        <span className="truncate min-w-0">{selected?.label ?? value}</span>
        <svg
          width={14} height={14} viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          {/* Mobile : pop-up centrée à l'écran, par-dessus tout (évite le menu qui
              dépasse du bord quand le bouton est proche du bord de l'écran). */}
          <div className="md:hidden fixed inset-0 z-[9999] flex items-center justify-center px-6" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="relative w-full max-w-xs max-h-[70vh] overflow-y-auto bg-white border border-[#E2E8F0] rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full text-left px-4 py-3 text-[14px] transition-colors hover:bg-[#F0FDF4] hover:text-[#166534] border-b border-[#F2F4F7] last:border-0"
                  style={{
                    background: opt.value === value ? '#F0FDF4' : 'transparent',
                    color: opt.value === value ? '#166534' : '#263238',
                    fontWeight: opt.value === value ? 600 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop : dropdown classique positionné sous le bouton. */}
          <div className="hidden md:block absolute left-0 top-[calc(100%+6px)] z-[9999] bg-white border border-[#E2E8F0] rounded-xl shadow-[0_8px_32px_rgba(171,190,209,0.45)] overflow-hidden min-w-full">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-[14px] transition-colors hover:bg-[#F0FDF4] hover:text-[#166534]"
                style={{
                  background: opt.value === value ? '#F0FDF4' : 'transparent',
                  color: opt.value === value ? '#166534' : '#263238',
                  fontWeight: opt.value === value ? 600 : 400,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
