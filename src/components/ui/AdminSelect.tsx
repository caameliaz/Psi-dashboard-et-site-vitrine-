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
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-[0_8px_32px_rgba(171,190,209,0.45)] overflow-hidden min-w-full">
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
      )}
    </div>
  );
}
