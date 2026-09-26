'use client';

import { useEffect, useRef } from 'react';

// Rafraîchissement périodique de l'admin, économe en requêtes Vercel / réveils Neon :
// - s'exécute toutes les `intervalMs` UNIQUEMENT quand l'onglet est affiché ;
// - en pause complète quand l'onglet est caché (autre onglet, fenêtre réduite) ;
// - rafraîchit immédiatement quand l'onglet redevient visible.
// `enabled: false` coupe le polling (ex. filtre actif sur le dashboard).
export function usePolling(callback: () => void, intervalMs: number, enabled = true) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => { if (id === null) id = setInterval(() => callbackRef.current(), intervalMs); };
    const stop = () => { if (id !== null) { clearInterval(id); id = null; } };
    const onVisibilityChange = () => {
      if (document.hidden) { stop(); return; }
      callbackRef.current();
      start();
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, enabled]);
}
