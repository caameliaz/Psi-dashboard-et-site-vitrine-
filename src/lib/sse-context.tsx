'use client';

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';

export interface SSEPayload {
  event: string;
  notif: { id: string; type: string; title: string; message: string; createdAt: string; targetUserId?: string } | null;
}

interface SSEContextValue {
  subscribe: (fn: (payload: SSEPayload) => void) => () => void;
}

const SSEContext = createContext<SSEContextValue>({ subscribe: () => () => {} });

export function SSEProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<(p: SSEPayload) => void>());
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelayRef = useRef(3000); // Délai initial: 3s
  const retryCountRef = useRef(0); // Compteur de tentatives

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource('/api/sse');
    esRef.current = es;

    es.onopen = () => {
      retryDelayRef.current = 3000;
      retryCountRef.current = 0;
    };

    es.onmessage = (e) => {
      try {
        const payload: SSEPayload = JSON.parse(e.data);
        listeners.current.forEach((fn) => fn(payload));
      } catch { /* ping ou data non-JSON */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      
      // ✅ Backoff exponentiel: 3s → 6s → 12s → 24s → 48s → 60s (max)
      retryCountRef.current += 1;
      
      // Après 10 tentatives (environ 5 minutes), arrêter complètement
      if (retryCountRef.current > 10) {
        console.warn('🔴 SSE: Trop de tentatives échouées, abandon du SSE');
        return;
      }
      
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, 60000);
      console.log(`🔄 SSE reconnect dans ${retryDelayRef.current / 1000}s (tentative ${retryCountRef.current})`);
      
      retryRef.current = setTimeout(connect, retryDelayRef.current);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [connect]);

  const subscribe = useCallback((fn: (p: SSEPayload) => void) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  return <SSEContext.Provider value={{ subscribe }}>{children}</SSEContext.Provider>;
}

export function useSSEContext() {
  return useContext(SSEContext);
}
