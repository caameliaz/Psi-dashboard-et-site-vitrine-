import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { syncProductionList } from '@/lib/stock-lists';
import { OPEN_PRODUCTION_STATUSES } from '@/lib/order-stock';
import { openOrdersByProduct } from '@/lib/stock-traceability';

const INCLUDE = {
  product: { select: { id: true, reference: true, name: true, mode: true, available: true, productionThreshold: true } },
} as const;

// GET /api/production-list — liste de production (synchronisée par seuil à chaque lecture)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await syncProductionList();
    // Les lignes "Produit" sont soldées → elles disparaissent de la liste (l'historique
    // reste consultable via l'audit, cf. src/lib/audit.ts).
    const items = await prisma.productionListItem.findMany({ where: { status: { not: 'PRODUIT' } }, include: INCLUDE, orderBy: { createdAt: 'asc' } });

    // Traçabilité : commandes/devis "en cours" sur ce produit — cf. src/lib/stock-traceability.ts.
    const byProduct = await openOrdersByProduct(items.map((i) => i.productId));
    const withLinks = items.map((i) => ({ ...i, ...(byProduct.get(i.productId) ?? { orderItems: [], quoteItems: [] }) }));

    return NextResponse.json(withLinks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch production list' }, { status: 500 });
  }
}

// POST /api/production-list — ajout manuel d'une ligne (permission modifier_stock)
// body: { productId: string, neededQuantity: number }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const qty = Number(body.neededQuantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });
    if (!body.productId) return NextResponse.json({ error: 'Produit requis' }, { status: 400 });

    // Une seule carte par produit : si une ligne pas encore fabriquée existe déjà
    // (À produire ou Bloquée), on ajoute simplement à son manquant au lieu d'en créer une autre.
    const existing = await prisma.productionListItem.findFirst({
      where: { productId: body.productId, status: { in: [...OPEN_PRODUCTION_STATUSES] } },
    });

    const item = existing
      ? await prisma.productionListItem.update({ where: { id: existing.id }, data: { neededQuantity: { increment: qty } }, include: INCLUDE })
      : await prisma.productionListItem.create({ data: { productId: body.productId, neededQuantity: qty, auto: false }, include: INCLUDE });

    createAudit({ userId: session?.user?.id, action: 'Ligne ajoutée à la liste de production', entity: 'STOCK', entityId: item.id, detail: `${item.product.reference} — ${qty}` });
    return NextResponse.json(item, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create production list item' }, { status: 500 });
  }
}
