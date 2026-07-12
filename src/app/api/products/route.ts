import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// GET /api/products — produits actifs (public)
// GET /api/products?all=true — tous les produits (admin)
export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.get('all') === 'true';

  if (all) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      where: all ? undefined : { active: true },
      include: {
        category: true,
        customFields: { include: { definition: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products — créer un produit (permission modifier_produits)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();

    if (!body.reference || !body.categoryId || body.width == null || body.length == null || body.price == null) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        reference: body.reference,
        width: Number(body.width),
        length: Number(body.length),
        usage: body.usage ?? '',
        price: Number(body.price),
        photo: body.photo ?? null,
        active: body.active ?? true,
        categoryId: body.categoryId,
      },
      include: { category: true, customFields: { include: { definition: true } } },
    });

    createAudit({ userId: session?.user?.id, action: 'Produit créé', entity: 'PRODUIT', entityId: product.id, detail: product.reference });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
