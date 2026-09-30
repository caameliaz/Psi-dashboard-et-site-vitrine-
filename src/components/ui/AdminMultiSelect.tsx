'use client';

import { useRef, useState, useEffect } from 'react';

interface Option { value: string; label: string; }

interface AdminMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: Option[];
  placeholder: string; // affiché quand rien n'est coché
  className?: string;
}

// Même look que AdminSelect, mais avec des cases à cocher (plusieurs choix possibles).
// Le menu reste ouvert pendant qu'on coche ; clic en dehors = fermeture.
export function AdminMultiSelect({ values, onChange, options, placeholder, className = '' }: AdminMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label);
  const text = labels.length === 0 ? placeholder : labels.length <= 2 ? labels.join(', ') : `${labels.length} sélectionnés`;

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-1 px-2.5 md:px-4 py-2.5 rounded-xl border bg-white text-[13px] md:text-[14px] text-[#263238] transition-all outline-none w-full ${
          open
            ? 'border-[#4CAF4F] ring-[3px] ring-[#4CAF4F]/15'
            : values.length > 0 ? 'border-[#4CAF4F]' : 'border-[#E2E8F0] hover:border-[#ABBED1]'
        }`}
      >
        <span className="truncate min-w-0">{text}</span>
        <svg
          width={14} height={14} viewBox="0 0 16 16" fill="none"
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[9999] bg-white border border-[#E2E8F0] rounded-xl shadow-[0_8px_32px_rgba(171,190,209,0.45)] min-w-full py-1">
          {options.map((opt) => {
            const checked = values.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 text-[14px] whitespace-nowrap transition-colors hover:bg-[#F0FDF4]"
                style={{ color: checked ? '#166534' : '#263238', fontWeight: checked ? 600 : 400 }}
              >
                <span
                  className="w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center"
                  style={{ borderColor: checked ? '#4CAF4F' : '#CBD5E1', background: checked ? '#4CAF4F' : '#fff' }}
                >
                  {checked && (
                    <svg width={10} height={10} viewBox="0 0 16 16" fill="none">
                      <path d="M3 8.5l3.5 3.5L13 4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                {opt.label}
              </button>
            );
          })}
          {values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-4 py-2 text-[12px] font-semibold text-[#8A9BB5] hover:text-[#374151] border-t border-[#F2F4F7]"
            >
              Tout décocher
            </button>
          )}
        </div>
      )}
    </div>
  );
}
