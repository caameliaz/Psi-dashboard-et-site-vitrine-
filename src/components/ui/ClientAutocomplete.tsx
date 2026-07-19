'use client';

import { useState, useEffect, useRef } from 'react';

export interface ClientLight {
  id: string; name: string; company: string | null; email: string | null;
  wilaya: string; commune: string | null; phone: string;
}

// Champ "Nom" avec autocomplete des clients existants.
// - taper = met à jour la valeur (nouveau client possible)
// - choisir dans la liste = appelle onPick avec le client complet (pré-remplissage)
export function ClientAutocomplete({
  value, onChange, onPick, inputClass, placeholder = 'Prénom Nom',
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (client: ClientLight) => void;
  inputClass?: string;
  placeholder?: string;
}) {
  const [clients, setClients] = useState<ClientLight[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/clients?light=true').then((r) => (r.ok ? r.json() : [])).then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = q
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q) || c.phone.includes(q)
      ).slice(0, 6)
    : [];

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-[120] top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#E2E8F0] shadow-xl overflow-hidden max-h-[220px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onPick(c); onChange(c.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#F0FDF4] transition-colors border-b border-[#F2F4F7] last:border-b-0"
            >
              <p className="text-[13px] font-semibold text-[#0F172A] leading-tight">{c.name}</p>
              <p className="text-[11px] text-[#8A9BB5] mt-0.5 truncate">
                {[c.company, c.phone, c.wilaya].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
