import { NextRequest, NextResponse } from 'next/server';
import { scanLowStock } from '@/lib/low-stock';

// GET /api/cron/stock-alerts — contrôle quotidien du stock (Vercel Cron). Rattrape les changements faits hors des
// écrans habituels et réarme les alertes. Même protection que les récaps : l'en-tête « Authorization: Bearer <CRON_SECRET> ».
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  await scanLowStock();
  return NextResponse.json({ ok: true });
}
