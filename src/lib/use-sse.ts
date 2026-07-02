'use client';

import { useEffect } from 'react';

export function useSSE(onEvent: (event: string) => void) {
  useEffect(() => {
    const es = new EventSource('/api/sse');
    es.onmessage = (e) => onEvent(e.data);
    es.onerror = () => {
      // Reconnect automatique géré par le browser nativement
    };
    return () => es.close();
  }, [onEvent]);
}
