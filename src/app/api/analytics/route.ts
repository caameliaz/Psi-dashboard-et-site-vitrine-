import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMonthlyPageViews, getWeeklyPageViews } from '@/lib/ga4';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — statistiques GA4
// pour le dashboard (mois en cours par défaut)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startDate = request.nextUrl.searchParams.get('startDate')?.slice(0, 10);
  const endDate = request.nextUrl.searchParams.get('endDate')?.slice(0, 10);
  const range = startDate && endDate && ISO_DATE.test(startDate) && ISO_DATE.test(endDate)
    ? { startDate, endDate }
    : undefined;

  try {
    const [monthly, weekly] = await Promise.all([
      getMonthlyPageViews(range),
      getWeeklyPageViews(),
    ]);

    return NextResponse.json({
      monthly,
      weekly,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
