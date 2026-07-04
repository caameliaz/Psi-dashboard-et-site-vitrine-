'use client';

import { useEffect } from 'react';
import { useSSEContext } from './sse-context';

// Thin wrapper autour du SSEContext partagé — une seule connexion EventSource pour tout l'admin
export function useSSE(onEvent: (event: string) => void) {
  const { subscribe } = useSSEContext();
  useEffect(() => {
    return subscribe((payload) => onEvent(payload.event));
  }, [subscribe, onEvent]);
}
