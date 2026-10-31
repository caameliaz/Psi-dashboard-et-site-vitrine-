import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET /api/free-text-recipes — TOUTES les références libres (sans fiche produit, cf. saveFreeTextRecipe dans
// order-stock.ts) pour la page Recettes : celles qui ont une recette, celles qui ont du stock, et celles vues dans
// des commandes/devis. Une réf libre sans recette est renvoyée avec `items: []` (et `id: null` si sa ligne n'existe
// pas encore) : on peut alors lui en ajouter une depuis la page.
export async function GET() {
  const guard = await requirePermission('voir_stock');
  if (guard.error) return guard.error;

  try {
    const [rows, orderItems, quoteItems] = await Promise.all([
      prisma.freeTextRecipe.findMany({ include: { items: { include: { rawMaterial: true } } } }),
      prisma.orderItem.findMany({ where: { productId: null, description: { not: null } }, select: { description: true }, distinct: ['description'] }),
      prisma.quoteItem.findMany({ where: { productId: null, description: { not: null } }, select: { description: true }, distinct: ['description'] }),
    ]);
    const byLabel = new Map(rows.map((r) => [r.label, r]));
    const labels = new Set<string>(rows.map((r) => r.label));
    for (const i of [...orderItems, ...quoteItems]) { const l = i.description?.trim(); if (l) labels.add(l); }
    const result = [...labels]
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
      .map((label) => byLabel.get(label) ?? { id: null, label, items: [] });
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch free text recipes' }, { status: 500 });
  }
}

// POST /api/free-text-recipes — crée (si besoin) la ligne d'une référence libre et renvoie son id, pour pouvoir lui
// ajouter une recette depuis la page Recettes. body: { label: string }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const label = String(body.label ?? '').trim();
    if (!label) return NextResponse.json({ error: 'Référence manquante' }, { status: 400 });
    const row = await prisma.freeTextRecipe.upsert({ where: { label }, create: { label }, update: {}, include: { items: { include: { rawMaterial: true } } } });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create free text recipe' }, { status: 500 });
  }
}
