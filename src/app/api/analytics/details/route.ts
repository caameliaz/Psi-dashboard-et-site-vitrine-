import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteDetails, getMonthlyVisits, rangeFromSearchParams } from '@/lib/ga4';
import { getCartStats } from '@/lib/cart-stats';

// GET /api/analytics/details?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — villes, clics
// WhatsApp, produits consultés et paniers (créés/abandonnés/convertis) du site public
// (fenêtre « Site public » du dashboard). Chargé seulement à l'ouverture de la fenêtre
// (pas dans le polling du dashboard) ; c'est aussi ici, à la demande, que les paniers
// inactifs depuis 24h basculent "abandonné" (cf. getCartStats — pas de cron).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const range = rangeFromSearchParams(request.nextUrl.searchParams);
  const now = new Date();
  const cartRange = range ?? {
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };

  try {
    const [details, cart, monthlyVisits] = await Promise.all([
      getSiteDetails(range),
      getCartStats(cartRange).catch((e) => { console.error('[cart-stats]', e); return null; }),
      getMonthlyVisits().catch((e) => { console.error('[GA4] visites par mois', e); return null; }),
    ]);
    return NextResponse.json({ ...details, cart, monthlyVisits });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch analytics details' }, { status: 500 });
  }
}
