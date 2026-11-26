'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { LANG_META, LOCALES, type Lang } from '@/lib/i18n/config';

// Sélecteur de langue du site public : une pastille « icône de traduction + nom de la langue » ; au survol
// (ou au toucher sur téléphone), un menu s'ouvre pour choisir une autre langue. Chaque langue a sa propre adresse.
export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Souris : survol = ouverture immédiate, fermeture légèrement différée (le curseur peut passer du bouton au menu sans le fermer).
  // Écran tactile : un tap émet aussi un « survol » émulé qui annulerait le clic → seule la souris compte pour le survol.
  const pointer = useRef<string>('mouse');
  const hoverOpen = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; clearTimeout(closeTimer.current); setOpen(true); };
  const hoverClose = (e: React.PointerEvent) => { if (e.pointerType !== 'mouse') return; clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 180); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const choose = (l: Lang) => { setOpen(false); setLang(l); };

  return (
    <div
      ref={ref}
      dir="ltr"
      className="fixed bottom-6 left-4 z-50"
      onPointerEnter={hoverOpen}
      onPointerLeave={hoverClose}
    >
      {/* Menu : au-dessus de la pastille ; le `pb-2` forme un pont sans vide entre les deux (le survol ne se coupe pas) */}
      {/* Toujours dans la page : l'ouverture / fermeture est une transition (fondu + glissement + léger zoom), pas une apparition sèche */}
      <div
        className="absolute bottom-full left-0 pb-2 origin-bottom-left motion-reduce:!transition-none"
        aria-hidden={!open}
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.96)',
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          // `visibility` bascule APRÈS le fondu à la fermeture (sinon le menu disparaîtrait d'un coup)
          transition: open
            ? 'opacity 260ms cubic-bezier(0.22, 1, 0.36, 1), transform 260ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s'
            : 'opacity 180ms ease-in, transform 180ms ease-in, visibility 0s linear 180ms',
        }}
      >
          <ul
            role="menu"
            aria-label="Language"
            className="min-w-[168px] overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white py-1.5 shadow-[0_12px_32px_rgba(38,50,56,0.18)]"
          >
            {LOCALES.map((l) => {
              const active = l === lang;
              return (
                <li key={l} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    lang={l}
                    onClick={() => choose(l)}
                    className={`flex w-full items-center justify-between gap-6 px-4 py-2.5 text-start text-[14px] transition-colors ${
                      active ? 'bg-[#F0FDF4] font-bold text-[#166534]' : 'font-medium text-[#263238] hover:bg-[#F5F7FA]'
                    }`}
                  >
                    <span>{LANG_META[l].native}</span>
                    {active ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3.5 8.5l3 3 6-7" stroke="#4CAF4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="text-[11px] font-bold text-[#ABBED1]">{LANG_META[l].short}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
      </div>

      <button
        type="button"
        onPointerDown={(e) => { pointer.current = e.pointerType; }}
        // Souris : le survol a déjà ouvert le menu, le clic ne doit pas le refermer ; toucher / clavier : bascule
        onClick={() => (pointer.current === 'mouse' ? setOpen(true) : setOpen((v) => !v))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${LANG_META[lang].native} — change language`}
        className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white py-2 ps-3 pe-3.5 text-[13px] font-bold text-[#263238] transition-colors hover:border-[#4CAF4F] hover:text-[#166534]"
        style={{ boxShadow: '0 2px 8px rgba(76,175,79,0.18)' }}
      >
        {/* Icône de traduction (A ⇄ 文) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 5h8M7 3v2M5 5c0 3 2.2 5.6 5 7M9.5 5c-.4 2.6-2.4 5.3-5.5 7" stroke="#4CAF4F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5 20l4-9 4 9M13.9 17h5.2" stroke="#4CAF4F" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span lang={lang}>{LANG_META[lang].native}</span>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M4 6l4 4 4-4" stroke="#8A9BB5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
