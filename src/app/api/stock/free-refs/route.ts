import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// Réfs libres = lignes de commande/devis SANS fiche produit (texte tapé à la main, hors
// catalogue). Leur stock vit sur FreeTextRecipe (une ligne par libellé EXACT, déjà utilisée
// pour mémoriser leur recette) — créée à la première action de stock si elle n'existe pas.

// GET /api/stock/free-refs — toutes les réfs libres vues dans les commandes/devis + leur stock
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [orderItems, quoteItems, stocks] = await Promise.all([
      prisma.orderItem.findMany({ where: { productId: null, description: { not: null } }, select: { description: true }, distinct: ['description'] }),
      prisma.quoteItem.findMany({ where: { productId: null, description: { not: null } }, select: { description: true }, distinct: ['description'] }),
      prisma.freeTextRecipe.findMany({ select: { label: true, available: true } }),
    ]);
    const stockByLabel = new Map(stocks.map((s) => [s.label, s.available]));
    const labels = new Set<string>();
    for (const i of [...orderItems, ...quoteItems]) { const l = i.description?.trim(); if (l) labels.add(l); }
    for (const s of stocks) if (s.available > 0) labels.add(s.label); // restockée puis plus utilisée : reste visible
    const rows = [...labels].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })).map((label) => ({ label, available: stockByLabel.get(label) ?? 0 }));
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch free refs' }, { status: 500 });
  }
}

// POST /api/stock/free-refs — body: { label, quantity, action: 'restock' | 'correction' }
// restock = ajoute `quantity` au disponible ; correction = fixe le disponible à `quantity`.
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const label = String(body.label ?? '').trim();
    const qty = Number(body.quantity);
    if (!label) return NextResponse.json({ error: 'Référence manquante' }, { status: 400 });
    if (Number.isNaN(qty) || qty < 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });
    if (body.action !== 'restock' && body.action !== 'correction') return NextResponse.json({ error: "Action invalide ('restock' | 'correction')" }, { status: 400 });

    const restock = body.action === 'restock';
    const row = await prisma.freeTextRecipe.upsert({
      where: { label },
      create: { label, available: qty },
      update: { available: restock ? { increment: qty } : qty },
    });
    createAudit({ userId: session?.user?.id, action: restock ? 'Réapprovisionnement réf libre' : 'Correction stock réf libre', entity: 'STOCK', entityId: row.id, detail: `${label} → ${row.available}` });
    return NextResponse.json({ ok: true, available: row.available });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update free ref stock' }, { status: 500 });
  }
}
