import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { distributeProduction } from '@/lib/order-stock';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/production-list/[id] — "Marquer fabriquée"
// body: { quantity: number }
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });

    const item = await prisma.productionListItem.findUnique({ where: { id }, include: { product: true } });
    if (!item) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 });

    // Consomme définitivement les matières premières réservées pour la quantité produite.
    const recipe = await prisma.recipeItem.findMany({ where: { productId: item.productId } });
    for (const r of recipe) {
      await prisma.rawMaterial.update({ where: { id: r.rawMaterialId }, data: { reserved: { decrement: r.quantity * qty } } }).catch(() => {});
    }

    // ⚠️ Une production PARTIELLE laisse la ligne ouverte (toujours A_PRODUIRE/BLOQUE) —
    // la synchro par seuil continue donc de recalculer bufferQuantity à chaque lecture.
    // Il ne faut donc PAS fusionner bufferQuantity dans neededQuantity ici (sinon la
    // synchro suivante rajoute un nouveau rattrapage par-dessus l'ancien déjà fusionné →
    // le total augmente au lieu de diminuer). On entame le besoin réel en premier, puis
    // le rattrapage seulement si la quantité produite le dépasse — chacun reste dans son
    // propre champ, la synchro se chargera de recalculer bufferQuantity au prochain accès.
    const fromNeeded = Math.min(item.neededQuantity, qty);
    const fromBuffer = Math.min(item.bufferQuantity, qty - fromNeeded);
    const newNeeded = item.neededQuantity - fromNeeded;
    const newBuffer = item.bufferQuantity - fromBuffer;
    const remaining = newNeeded + newBuffer;
    await prisma.productionListItem.update({
      where: { id },
      data: {
        producedQuantity: { increment: qty },
        neededQuantity: newNeeded,
        bufferQuantity: newBuffer,
        ...(remaining <= 0 ? { status: 'PRODUIT' } : {}),
      },
    });

    // Distribue la quantité produite aux commandes/devis liés (→ Réservé), le
    // reliquat éventuel (réassort manuel/seuil) part en Disponible.
    await distributeProduction(id, qty, item.productId);

    const updated = await prisma.productionListItem.findUnique({ where: { id } });
    createAudit({ userId: session?.user?.id, action: `Production réalisée (+${qty})`, entity: 'STOCK', entityId: id, detail: item.product.reference });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update production list item' }, { status: 500 });
  }
}

// DELETE /api/production-list/[id] — retirer une ligne de la liste
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    await prisma.productionListItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete production list item' }, { status: 500 });
  }
}
