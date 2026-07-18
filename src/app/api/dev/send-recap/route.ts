import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { sendDailyRecap } from '@/lib/recaps/sendDailyRecap';
import { sendWeeklyRecap } from '@/lib/recaps/sendWeeklyRecap';

// Route TEMPORAIRE pour déclencher un récap manuellement en local pendant le
// développement (avant que Trigger.dev soit branché). Réservée aux ADMIN.
// Voir README-EMAIL.md — "Tester manuellement" — pour l'usage.
//
// GET /api/dev/send-recap?type=daily
// GET /api/dev/send-recap?type=weekly
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get('type');
  if (type !== 'daily' && type !== 'weekly') {
    return NextResponse.json({ error: "Paramètre 'type' requis : 'daily' ou 'weekly'" }, { status: 400 });
  }

  try {
    const result = type === 'daily' ? await sendDailyRecap() : await sendWeeklyRecap();
    return NextResponse.json({ type, ...result });
  } catch (error) {
    console.error('[GET /api/dev/send-recap] ERROR:', error);
    return NextResponse.json({ error: 'Failed to send recap' }, { status: 500 });
  }
}
