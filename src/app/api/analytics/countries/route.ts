import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCountryVisits, rangeFromSearchParams } from '@/lib/ga4';

// GET /api/analytics/countries?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — visites par pays du site public
// (bloc « Pays » de la fenêtre « Site public », qui a sa propre période). Période obligatoire.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const range = rangeFromSearchParams(request.nextUrl.searchParams);
  if (!range) return NextResponse.json({ error: 'startDate et endDate requis' }, { status: 400 });

  try {
    const countries = await getCountryVisits(range);
    if (!countries) return NextResponse.json({ error: 'GA4 indisponible' }, { status: 502 });
    return NextResponse.json({ countries });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
  }
}
