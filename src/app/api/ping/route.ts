import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/ping — requête ultra-légère pour garder la base Neon réveillée.
// Appelée automatiquement par le cron Vercel (voir vercel.json) toutes les ~5 min,
// pour éviter que Neon se mette en veille ("scale to zero").
// Public volontairement (pas d'auth) : ne renvoie aucune donnée sensible.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch {
    // Même en cas d'échec (base en cours de réveil), la requête l'a réveillée.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
