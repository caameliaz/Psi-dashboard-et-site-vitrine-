'use client';

import { useState, useEffect } from 'react';

// Détecte si on est sur un écran mobile (< 768px, aligné sur le breakpoint `md` de Tailwind).
// Retourne `null` tant qu'on n'a pas mesuré (évite un flash côté serveur/hydratation).
export function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
