import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/products/[id]/recipe — remplace entièrement la recette d'un produit
// body: { items: [{ rawMaterialId: string, quantity: number }] }
export async function PUT(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();
    const items: { rawMaterialId: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];

    for (const item of items) {
      if (!item.rawMaterialId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: 'Chaque ligne de recette doit avoir une matière première et une quantité valide' }, { status: 400 });
      }
    }

    const product = await prisma.product.findUnique({ where: { id }, select: { name: true, reference: true } });
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    await prisma.$transaction([
      prisma.recipeItem.deleteMany({ where: { productId: id } }),
      ...(items.length > 0
        ? [prisma.recipeItem.createMany({
            data: items.map((i) => ({ productId: id, rawMaterialId: i.rawMaterialId, quantity: Number(i.quantity) })),
          })]
        : []),
    ]);

    const recipeItems = await prisma.recipeItem.findMany({ where: { productId: id }, include: { rawMaterial: true } });

    const prodLabel = product.name ? `${product.name} (${product.reference})` : product.reference;
    createAudit({ userId: session?.user?.id, action: 'Recette modifiée', entity: 'PRODUIT', entityId: id, detail: prodLabel });
    return NextResponse.json(recipeItems);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}
