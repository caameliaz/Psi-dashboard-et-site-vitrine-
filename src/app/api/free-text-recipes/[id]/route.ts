import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/free-text-recipes/[id] — remplace entièrement les matières d'une recette de ligne
// LIBRE déjà enregistrée (même permission que la recette d'un produit).
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
    if (items.length === 0) {
      return NextResponse.json({ error: 'Une recette de référence libre doit avoir au moins une matière (sinon, supprimez-la)' }, { status: 400 });
    }

    const existing = await prisma.freeTextRecipe.findUnique({ where: { id }, select: { label: true } });
    if (!existing) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

    await prisma.$transaction([
      prisma.freeTextRecipeItem.deleteMany({ where: { freeTextRecipeId: id } }),
      prisma.freeTextRecipeItem.createMany({ data: items.map((i) => ({ freeTextRecipeId: id, rawMaterialId: i.rawMaterialId, quantity: Number(i.quantity) })) }),
    ]);

    const updated = await prisma.freeTextRecipe.findUnique({ where: { id }, include: { items: { include: { rawMaterial: true } } } });

    createAudit({ userId: session?.user?.id, action: 'Recette de référence libre modifiée', entity: 'PRODUIT', entityId: id, detail: existing.label });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update free text recipe' }, { status: 500 });
  }
}

// DELETE /api/free-text-recipes/[id] — supprime une recette de ligne libre : les prochaines
// lignes portant ce texte redemanderont explicitement quoi faire (§1.5 TESTS-STOCK.md).
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const existing = await prisma.freeTextRecipe.findUnique({ where: { id }, select: { label: true } });
    if (!existing) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

    await prisma.freeTextRecipe.delete({ where: { id } });

    createAudit({ userId: session?.user?.id, action: 'Recette de référence libre supprimée', entity: 'PRODUIT', entityId: id, detail: existing.label });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete free text recipe' }, { status: 500 });
  }
}
