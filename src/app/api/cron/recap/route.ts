import { NextRequest, NextResponse } from 'next/server';
import { sendDailyRecap } from '@/lib/recaps/sendDailyRecap';
import { sendWeeklyRecap } from '@/lib/recaps/sendWeeklyRecap';

// GET /api/cron/recap?type=daily|weekly — déclenché automatiquement par Vercel Cron.
// Planification définie dans vercel.json :
//   • daily  → tous les jours à 20h00 (heure d'Alger)
//   • weekly → jeudi à 23h59 (heure d'Alger)
//
// Sécurité : Vercel envoie l'en-tête "Authorization: Bearer <CRON_SECRET>".
// Sans le bon secret, la route est refusée (sinon n'importe qui pourrait
// déclencher des envois d'emails en masse depuis l'extérieur).

export const maxDuration = 60; // les envois d'emails peuvent prendre du temps

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get('type') === 'weekly' ? 'weekly' : 'daily';

  try {
    const result = type === 'weekly' ? await sendWeeklyRecap() : await sendDailyRecap();
    return NextResponse.json({ type, ...result });
  } catch (e) {
    console.error(`[CRON ${type}]`, e);
    return NextResponse.json({ error: 'Échec de l\'envoi du récap' }, { status: 500 });
  }
}
