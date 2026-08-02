import { NextRequest, NextResponse } from 'next/server';
import { addSSEClient } from '@/lib/sse-bus';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro: garde la connexion jusqu'à 60s (gratuit = 10s max)

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id ?? 'anonymous';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch { /* déconnecté */ }
      };

      const remove = addSSEClient(userId, send);

      // Keepalive ping every 25s pour éviter timeout proxy/browser
      const pingId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          clearInterval(pingId);
        }
      }, 25000);

      // Cleanup quand le client se déconnecte
      request.signal.addEventListener('abort', () => {
        remove();
        clearInterval(pingId);
        try { controller.close(); } catch { /* déjà fermé */ }
      });
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

// Re-export pour compat avec les anciens imports
export { pushSSE as notifyClients } from '@/lib/sse-bus';
