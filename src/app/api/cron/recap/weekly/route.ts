import { NextRequest } from 'next/server';
import { runRecapCron } from '@/lib/recaps/run-cron';

// GET /api/cron/recap/weekly — bilan hebdo, déclenché par Vercel Cron le jeudi à 23h59 (Alger).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return runRecapCron(request, 'weekly');
}
