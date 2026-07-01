import { NextResponse } from 'next/server';

// Registered SSE clients — one Set per process (works for single-instance dev + prod)
const clients = new Set<(data: string) => void>();

// Called by orders/quotes POST to push an event to all connected admins
export function notifyClients(event: string) {
  clients.forEach((send) => send(event));
}

export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch { /* client disconnected */ }
      };

      clients.add(send);

      // Keepalive ping every 25s to prevent proxy/browser timeout
      intervalId = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')); } catch { clearInterval(intervalId); }
      }, 25000);

      // Cleanup on close
      (controller as any).signal?.addEventListener?.('abort', () => {
        clients.delete(send);
        clearInterval(intervalId);
      });
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
