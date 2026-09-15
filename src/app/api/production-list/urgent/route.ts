import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUrgentProductionNeeds } from '@/lib/order-stock';

// GET /api/production-list/urgent — résumé "Production urgente" : le manquant réel des seules
// commandes/devis marqués prioritaires, agrégé par produit. Lecture seule, jamais stocké (cf.
// getUrgentProductionNeeds) — disparaît de lui-même une fois toutes les commandes prioritaires
// entièrement produites. Ne remplace ni ne modifie la liste de production normale.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const needs = await getUrgentProductionNeeds();
    return NextResponse.json(needs);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch urgent production needs' }, { status: 500 });
  }
}
