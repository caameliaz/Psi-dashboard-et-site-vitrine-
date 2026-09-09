import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { resyncMaterialBufferOnly } from '@/lib/order-stock';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/raw-materials/[id] — modifier une matière première (permission modifier_stock)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    const material = await prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(body.reference !== undefined && { reference: body.reference }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.unit !== undefined && { unit: body.unit }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.stockMax !== undefined && { stockMax: Number(body.stockMax) }),
        ...(body.purchaseThreshold !== undefined && { purchaseThreshold: Number(body.purchaseThreshold) }),
        ...(body.available !== undefined && { available: Number(body.available) }),
        ...(body.reserved !== undefined && { reserved: Number(body.reserved) }),
      },
    });

    createAudit({ userId: session?.user?.id, action: 'Matière première modifiée', entity: 'MATIERE', entityId: id, detail: `${material.name} (${material.reference})` });

    if (body.stockMax !== undefined || body.purchaseThreshold !== undefined || body.available !== undefined) {
      await resyncMaterialBufferOnly(id);
    }

    return NextResponse.json(material);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Cette référence existe déjà' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to update raw material' }, { status: 500 });
  }
}

// DELETE /api/raw-materials/[id] — supprimer une matière première (permission modifier_stock)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const material = await prisma.rawMaterial.findUnique({ where: { id }, select: { name: true, reference: true } });
    if (!material) return NextResponse.json({ error: 'Matière première introuvable' }, { status: 404 });

    const usedInRecipes = await prisma.recipeItem.count({ where: { rawMaterialId: id } });
    if (usedInRecipes > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : utilisée dans ${usedInRecipes} recette(s). Retirez-la des recettes d'abord.` },
        { status: 409 }
      );
    }

    await prisma.rawMaterial.delete({ where: { id } });
    createAudit({ userId: session?.user?.id, action: 'Matière première supprimée', entity: 'MATIERE', entityId: id, detail: `${material.name} (${material.reference})` });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete raw material' }, { status: 500 });
  }
}
