import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMonthlyPageViews, getWeeklyPageViews } from '@/lib/ga4';

// GET /api/analytics — statistiques GA4 pour le dashboard
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [monthly, weekly] = await Promise.all([
      getMonthlyPageViews(),
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
