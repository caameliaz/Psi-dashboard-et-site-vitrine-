import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireAnyPermission } from '@/lib/access';
import { getRealtimeVisitors } from '@/lib/ga4';

// GET /api/analytics/realtime — visiteurs du site public sur les 30 dernières minutes.
// Appelé toutes les 60 s, uniquement tant que la fenêtre « Site public » est ouverte.
export async function GET() {
  const guard = await requireAnyPermission(['voir_contenu', 'modifier_contenu']);
  if (guard.error) return guard.error;
  const session = guard.session;

  const realtime = await getRealtimeVisitors();
  if (!realtime) return NextResponse.json({ error: 'Temps réel indisponible' }, { status: 502 });
  return NextResponse.json(realtime);
}
