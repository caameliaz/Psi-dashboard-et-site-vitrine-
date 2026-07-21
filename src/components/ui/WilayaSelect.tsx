'use client';

import { useState, useRef, useEffect } from 'react';

const WILAYAS = [
  '01 - Adrar', '02 - Chlef', '03 - Laghouat', '04 - Oum El Bouaghi', '05 - Batna',
  '06 - Béjaïa', '07 - Biskra', '08 - Béchar', '09 - Blida', '10 - Bouïra',
  '11 - Tamanrasset', '12 - Tébessa', '13 - Tlemcen', '14 - Tiaret', '15 - Tizi Ouzou',
  '16 - Alger', '17 - Djelfa', '18 - Jijel', '19 - Sétif', '20 - Saïda',
  '21 - Skikda', '22 - Sidi Bel Abbès', '23 - Annaba', '24 - Guelma', '25 - Constantine',
  '26 - Médéa', '27 - Mostaganem', "28 - M'Sila", '29 - Mascara', '30 - Ouargla',
  '31 - Oran', '32 - El Bayadh', '33 - Illizi', '34 - Bordj Bou Arréridj', '35 - Boumerdès',
  '36 - El Tarf', '37 - Tindouf', '38 - Tissemsilt', '39 - El Oued', '40 - Khenchela',
  '41 - Souk Ahras', '42 - Tipaza', '43 - Mila', '44 - Aïn Defla', '45 - Naâma',
  '46 - Aïn Témouchent', '47 - Ghardaïa', '48 - Relizane', '49 - Timimoun', '50 - Bordj Badji Mokhtar',
  '51 - Ouled Djellal', '52 - Béni Abbès', '53 - In Salah', '54 - In Guezzam',
  '55 - Touggourt', '56 - Djanet', "57 - El M'Ghair", '58 - El Meniaa',
];

interface WilayaSelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  name?: string;
}

export function WilayaSelect({ value, onChange, required, name }: WilayaSelectProps) {
  const [open, setOpen] = useState(false);
  // Ouvre le menu vers le HAUT quand le champ est trop bas dans la fenêtre
  // (sinon la liste est rognée par le conteneur qui défile).
  const [dropUp, setDropUp] = useState(false);
  // Position calculée à l'écran : le menu est rendu en `fixed` pour qu'AUCUN
  // parent en overflow (formulaire qui défile) ne puisse le rogner.
  const [coords, setCoords] = useState<{ left: number; top: number; bottom: number; width: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = WILAYAS.filter((w) =>
    w.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Le menu est en `fixed` (hors du conteneur) → il faut le tester à part,
      // sinon un clic sur une option fermerait avant de sélectionner.
      const dansChamp = ref.current?.contains(e.target as Node);
      const dansMenu = menuRef.current?.contains(e.target as Node);
      if (!dansChamp && !dansMenu) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    // Menu en `fixed` : si la page défile il resterait "collé" à l'écran → on ferme.
    // On ferme au DÉFILEMENT seulement. Surtout pas au `resize` : sur mobile,
    // l'ouverture du clavier redimensionne la fenêtre et refermait le menu aussitôt.
    const onScroll = (e: Event) => {
      // Ne pas fermer quand c'est la LISTE elle-même qu'on fait défiler.
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false); setSearch('');
    };
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  useEffect(() => {
    // Focus auto sur ORDINATEUR seulement : sur mobile ça ouvre le clavier,
    // ce qui masque la liste et perturbe la sélection.
    const estMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    if (open && !estMobile && searchRef.current) searchRef.current.focus();
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Hidden input for form validation */}
      <input
        type="hidden"
        name={name}
        value={value}
        required={required}
      />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border bg-white text-[14px] transition-all outline-none ${
          open
            ? 'border-[#4CAF4F] ring-[3px] ring-[#4CAF4F]/15'
            : 'border-[#E2E8F0] hover:border-[#ABBED1]'
        } ${value ? 'text-[#263238]' : 'text-[#9CA3AF]'}`}
      >
        <span className="truncate">{value || 'Sélectionner une wilaya'}</span>
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="#ABBED1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={menuRef}
          className="fixed z-[300] bg-white rounded-xl border border-[#E2E8F0] shadow-[0_8px_32px_rgba(171,190,209,0.45)] overflow-hidden"
          style={{
            left: coords?.left,
            width: coords?.width,
            ...(dropUp ? { bottom: coords?.bottom } : { top: coords?.top }),
          }}
        >
          {/* Search */}
          <div className="p-2 border-b border-[#F0F4F8]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F5F7FA]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <circle cx="7" cy="7" r="4.5" stroke="#ABBED1" strokeWidth="1.4"/>
                <path d="M10.5 10.5l2.5 2.5" stroke="#ABBED1" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="flex-1 bg-transparent text-[13px] text-[#263238] outline-none placeholder:text-[#ABBED1]"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-[#ABBED1] hover:text-[#263238]">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <ul className="max-h-[220px] overflow-y-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-[13px] text-[#ABBED1] text-center">Aucun résultat</li>
            ) : (
              filtered.map((w) => (
                <li key={w}>
                  <button
                    type="button"
                    onClick={() => { onChange(w); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                      value === w
                        ? 'bg-[#F0FDF4] text-[#4CAF4F] font-semibold'
                        : 'text-[#4D4D4D] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    {w}
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
