import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMonthlyPageViews, getWeeklyPageViews, rangeFromSearchParams } from '@/lib/ga4';

// GET /api/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — statistiques GA4
// pour le dashboard (mois en cours par défaut)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const range = rangeFromSearchParams(request.nextUrl.searchParams);

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
