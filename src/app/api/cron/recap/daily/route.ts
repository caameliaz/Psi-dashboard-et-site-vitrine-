import { NextRequest } from 'next/server';
import { runRecapCron } from '@/lib/recaps/run-cron';

// GET /api/cron/recap/daily — récap quotidien, déclenché par Vercel Cron à 20h (Alger).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runRecapCron(request, 'daily');
}
