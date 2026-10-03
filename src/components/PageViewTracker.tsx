'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/role-context';

// Enregistre chaque page admin ouverte par un compte en LECTURE SEULE (journal visible de la propriétaire
// uniquement, cf. /api/activity). Pour les autres comptes : ne fait rien du tout (aucune requête).
export function PageViewTracker() {
  const pathname = usePathname();
  const { readOnly, loading } = useRole();
  const last = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    if (loading || !readOnly || !pathname?.startsWith('/admin')) return;
    const now = Date.now();
    // Même page rouverte en moins de 30 s (rechargement, re-rendu) : une seule ligne
    if (last.current && last.current.path === pathname && now - last.current.at < 30_000) return;
    last.current = { path: pathname, at: now };
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname, readOnly, loading]);

  return null;
}
