// Singleton SSE bus — partagé entre toutes les routes du même process
// Chaque client SSE est enregistré avec son userId.
// pushSSE accepte une liste optionnelle de targetUserIds.

type SendFn = (data: string) => void;

interface ClientEntry { userId: string; send: SendFn; }

const g = globalThis as any;
if (!g.__sseBus) g.__sseBus = new Map<string, ClientEntry>();

const bus: Map<string, ClientEntry> = g.__sseBus;

export function addSSEClient(userId: string, fn: SendFn): () => void {
  const key = `${userId}-${Date.now()}-${Math.random()}`;
  bus.set(key, { userId, send: fn });
  return () => bus.delete(key);
}

export interface SSENotif {
  id: string; type: string; title: string; message: string; createdAt: string;
  targetUserId?: string;
}

/** Si targetUserIds est fourni, envoie uniquement aux clients concernés. */
export function pushSSE(event: string, notif?: SSENotif, targetUserIds?: string[]) {
  const payload = JSON.stringify({ event, notif: notif ?? null });
  bus.forEach((entry) => {
    if (targetUserIds && !targetUserIds.includes(entry.userId)) return;
    try { entry.send(payload); } catch { /* client déconnecté */ }
  });
}
