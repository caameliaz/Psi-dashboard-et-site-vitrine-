import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireAnyPermission } from '@/lib/access';

// GET /api/stock/products — vue stock des produits finis
export async function GET() {
  const guard = await requireAnyPermission(['voir_stock', 'voir_listes_stock', 'voir_stock_commercial', 'modifier_stock']);
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const [products, assignedGroups, rollinkGroups] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        select: {
          id: true, reference: true, name: true, price: true, mode: true,
          available: true, reserved: true, inDelivery: true, returned: true,
          stockMax: true, purchaseThreshold: true, productionThreshold: true,
          category: { select: { name: true } },
          recipeItems: { select: { id: true } },
        },
        orderBy: { reference: 'asc' },
      }),
      // `available` inclut le stock attribué aux commerciaux (plus décrémenté à
      // l'attribution, cf. stock/assignments/route.ts) — ce total sert à en dériver le
      // "stock hors commerciaux" à l'affichage (available − assignedToCommercials).
      prisma.stockAssignment.groupBy({ by: ['productId'], _sum: { quantity: true } }),
      // Part du « Réservé » qui vient de commandes RollLink encore actives (Confirmée / Disponible) —
      // sert à l'interrupteur « RollLink » de la page Stock (voir les chiffres avec / sans).
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { productId: { not: null }, order: { source: 'ROLLINK', status: { in: ['VALIDE', 'PRODUITE'] } } },
        _sum: { resolvedQuantity: true },
      }),
    ]);
    const assignedByProduct = new Map(assignedGroups.map((g) => [g.productId, g._sum.quantity ?? 0]));
    const rollinkByProduct = new Map(rollinkGroups.map((g) => [g.productId, g._sum.resolvedQuantity ?? 0]));
    return NextResponse.json(products.map((p) => ({
      ...p,
      assignedToCommercials: assignedByProduct.get(p.id) ?? 0,
      // jamais plus que le réservé réel du produit
      reservedRollink: Math.min(Math.max(0, p.reserved), rollinkByProduct.get(p.id) ?? 0),
    })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
