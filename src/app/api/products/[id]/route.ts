import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/products/[id] — modifier un produit (admin)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.reference !== undefined && { reference: body.reference }),
        ...(body.width !== undefined && { width: Number(body.width) }),
        ...(body.length !== undefined && { length: Number(body.length) }),
        ...(body.usage !== undefined && { usage: body.usage }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.photo !== undefined && { photo: body.photo }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      },
      include: { category: true, customFields: { include: { definition: true } } },
    });

    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/[id] — supprimer un produit (admin)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
