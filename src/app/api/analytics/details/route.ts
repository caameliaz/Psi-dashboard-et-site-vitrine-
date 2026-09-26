import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteDetails, rangeFromSearchParams } from '@/lib/ga4';

// GET /api/analytics/details?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — villes, clics
// WhatsApp et produits consultés du site public (fenêtre « Site public » du dashboard).
// Chargé seulement à l'ouverture de la fenêtre (pas dans le polling du dashboard).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await getSiteDetails(rangeFromSearchParams(request.nextUrl.searchParams)));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch analytics details' }, { status: 500 });
  }
}
