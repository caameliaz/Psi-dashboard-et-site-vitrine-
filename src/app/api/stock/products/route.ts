import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/stock/products — vue stock des produits finis
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [products, assignedGroups] = await Promise.all([
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
    ]);
    const assignedByProduct = new Map(assignedGroups.map((g) => [g.productId, g._sum.quantity ?? 0]));
    return NextResponse.json(products.map((p) => ({ ...p, assignedToCommercials: assignedByProduct.get(p.id) ?? 0 })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
