'use client';

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react';

export interface SSEPayload {
  event: string;
  notif: { id: string; type: string; title: string; message: string; createdAt: string } | null;
}

interface SSEContextValue {
  subscribe: (fn: (payload: SSEPayload) => void) => () => void;
}

const SSEContext = createContext<SSEContextValue>({ subscribe: () => () => {} });

export function SSEProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Set<(p: SSEPayload) => void>());
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource('/api/sse');
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload: SSEPayload = JSON.parse(e.data);
        listeners.current.forEach((fn) => fn(payload));
      } catch { /* ping ou data non-JSON */ }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      // Reconnect après 3s
      retryRef.current = setTimeout(connect, 3000);
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
