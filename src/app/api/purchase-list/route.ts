import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { syncPurchaseList } from '@/lib/stock-lists';
import { OPEN_PURCHASE_STATUSES } from '@/lib/order-stock';
import { openOrdersByProduct, productIdsUsingMaterial } from '@/lib/stock-traceability';

const INCLUDE = {
  product: { select: { id: true, reference: true, name: true, available: true, purchaseThreshold: true } },
  rawMaterial: { select: { id: true, reference: true, name: true, unit: true, available: true, purchaseThreshold: true } },
} as const;

// GET /api/purchase-list — liste d'achat (synchronisée par seuil à chaque lecture)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await syncPurchaseList();
    // Les lignes "Reçu" sont soldées → elles disparaissent de la liste (l'historique
    // reste consultable via l'audit, cf. src/lib/audit.ts).
    const items = await prisma.purchaseListItem.findMany({ where: { status: { not: 'RECU' } }, include: INCLUDE, orderBy: { createdAt: 'asc' } });

    // Traçabilité (cf. src/lib/stock-traceability.ts) : commandes/devis "en cours" sur ce
    // produit — ou, pour une matière première, sur les produits qui l'utilisent (recette).
    const materialIds = items.filter((i) => i.rawMaterialId).map((i) => i.rawMaterialId as string);
    const productsByMaterial = await productIdsUsingMaterial(materialIds);
    const allProductIds = [
      ...items.filter((i) => i.productId).map((i) => i.productId as string),
      ...[...productsByMaterial.values()].flat(),
    ];
    const byProduct = await openOrdersByProduct(allProductIds);

    const withLinks = items.map((i) => {
      if (i.productId) return { ...i, ...(byProduct.get(i.productId) ?? { orderItems: [], quoteItems: [] }) };
      const pids = productsByMaterial.get(i.rawMaterialId as string) ?? [];
      const orderItems = pids.flatMap((pid) => byProduct.get(pid)?.orderItems ?? []);
      const quoteItems = pids.flatMap((pid) => byProduct.get(pid)?.quoteItems ?? []);
      return { ...i, orderItems, quoteItems };
    });

    return NextResponse.json(withLinks);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch purchase list' }, { status: 500 });
  }
}

// POST /api/purchase-list — ajout manuel d'une ligne (permission modifier_stock)
// body: { productId?: string, rawMaterialId?: string, neededQuantity: number }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const qty = Number(body.neededQuantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });
    if (!body.productId && !body.rawMaterialId) return NextResponse.json({ error: 'Produit ou matière première requis' }, { status: 400 });

    // Une seule carte par produit/matière : si une ligne "À commander" existe déjà
    // pour cette référence, on ajoute simplement à son manquant au lieu d'en créer une autre.
    const existing = await prisma.purchaseListItem.findFirst({
      where: {
        status: { in: [...OPEN_PURCHASE_STATUSES] },
        ...(body.productId ? { productId: body.productId } : { rawMaterialId: body.rawMaterialId }),
      },
    });

    const item = existing
      ? await prisma.purchaseListItem.update({ where: { id: existing.id }, data: { neededQuantity: { increment: qty } }, include: INCLUDE })
      : await prisma.purchaseListItem.create({
          data: {
            productId: body.productId ?? null,
            rawMaterialId: body.rawMaterialId ?? null,
            neededQuantity: qty,
            auto: false,
          },
          include: INCLUDE,
        });

    const label = item.product ? item.product.reference : item.rawMaterial?.reference;
    createAudit({ userId: session?.user?.id, action: 'Ligne ajoutée à la liste d\'achat', entity: 'STOCK', entityId: item.id, detail: `${label} — ${qty}` });
    return NextResponse.json(item, { status: existing ? 200 : 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create purchase list item' }, { status: 500 });
  }
}
