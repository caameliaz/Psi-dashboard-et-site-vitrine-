import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getRealtimeVisitors } from '@/lib/ga4';

// GET /api/analytics/realtime — visiteurs du site public sur les 30 dernières minutes.
// Appelé toutes les 60 s, uniquement tant que la fenêtre « Site public » est ouverte.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const realtime = await getRealtimeVisitors();
  if (!realtime) return NextResponse.json({ error: 'Temps réel indisponible' }, { status: 502 });
  return NextResponse.json(realtime);
}
