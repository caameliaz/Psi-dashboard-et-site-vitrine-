import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/stock/products — vue stock des produits finis
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      select: {
        id: true, reference: true, name: true, price: true, mode: true,
        available: true, reserved: true, inDelivery: true, returned: true,
        stockMax: true, purchaseThreshold: true, productionThreshold: true,
        category: { select: { name: true } },
        recipeItems: { select: { id: true } },
      },
      orderBy: { reference: 'asc' },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
