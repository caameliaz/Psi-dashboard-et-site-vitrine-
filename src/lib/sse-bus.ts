// Singleton SSE bus — partagé entre toutes les routes du même process
// Les routes qui créent des events importent pushSSE()
// La route GET /api/sse s'y abonne

type SendFn = (data: string) => void;

// globalThis survit aux hot-reloads en dev et est partagé dans le même process
const g = globalThis as any;
if (!g.__sseBus) g.__sseBus = new Set<SendFn>();

const bus: Set<SendFn> = g.__sseBus;

export function addSSEClient(fn: SendFn): () => void {
  bus.add(fn);
  return () => bus.delete(fn);
}

export interface SSENotif {
  id: string; type: string; title: string; message: string; createdAt: string;
}

export function pushSSE(event: string, notif?: SSENotif) {
  const payload = JSON.stringify({ event, notif: notif ?? null });
  bus.forEach((send) => {
    try { send(payload); } catch { /* client déconnecté */ }
  });
}
