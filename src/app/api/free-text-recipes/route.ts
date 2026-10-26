import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET /api/free-text-recipes — recettes enregistrées pour des lignes LIBRES (sans fiche
// produit, cf. saveFreeTextRecipe dans order-stock.ts) — affichées dans la page Recettes.
export async function GET() {
  const guard = await requirePermission('voir_stock');
  if (guard.error) return guard.error;

  try {
    // La table porte aussi le stock des réfs libres : on ne liste que celles qui ont une recette.
    const recipes = await prisma.freeTextRecipe.findMany({
      where: { items: { some: {} } },
      include: { items: { include: { rawMaterial: true } } },
      orderBy: { label: 'asc' },
    });
    return NextResponse.json(recipes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch free text recipes' }, { status: 500 });
  }
}
