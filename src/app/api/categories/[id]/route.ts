import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/categories/[id] — renommer une catégorie (permission modifier_produits)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const body = await request.json();

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.photo !== undefined && { photo: body.photo }),
        ...(body.description !== undefined && { description: body.description }),
      },
    });

    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — supprimer une catégorie (admin)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${count} produit(s) sont dans cette catégorie` },
        { status: 409 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
