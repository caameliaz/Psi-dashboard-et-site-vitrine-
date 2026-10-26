import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requireAnyPermission } from '@/lib/access';
import { getMonthlyPageViews, getWeeklyPageViews, rangeFromSearchParams } from '@/lib/ga4';

// GET /api/analytics?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — statistiques GA4
// pour le dashboard (mois en cours par défaut)
export async function GET(request: NextRequest) {
  const guard = await requireAnyPermission(['voir_contenu', 'modifier_contenu']);
  if (guard.error) return guard.error;
  const session = guard.session;

  const range = rangeFromSearchParams(request.nextUrl.searchParams);

  try {
    const [monthly, weekly] = await Promise.all([
      getMonthlyPageViews(range),
      getWeeklyPageViews(range),
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
