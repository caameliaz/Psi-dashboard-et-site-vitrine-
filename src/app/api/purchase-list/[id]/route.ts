import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { distributePurchase, unblockProductionForMaterial } from '@/lib/order-stock';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/purchase-list/[id] — "Commander" ou "Valider réception"
// body: { action: 'order', quantity: number } | { action: 'receive', quantity: number }
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });

    const item = await prisma.purchaseListItem.findUnique({ where: { id }, include: { product: true, rawMaterial: true } });
    if (!item) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 });

    if (body.action === 'order') {
      // Un éventuel rattrapage préventif (bufferQuantity) se replie ici dans le besoin
      // réel : une fois commandé au fournisseur, ce n'est plus un simple ajustement de
      // seuil librement recalculable, c'est un engagement réel.
      const updated = await prisma.purchaseListItem.update({
        where: { id }, data: { neededQuantity: { increment: item.bufferQuantity }, bufferQuantity: 0, orderedQuantity: qty, status: 'COMMANDE' },
      });
      const label = item.product?.reference ?? item.rawMaterial?.reference;
      createAudit({ userId: session?.user?.id, action: `Commande fournisseur passée (${qty})`, entity: 'STOCK', entityId: id, detail: `${label}` });
      return NextResponse.json(updated);
    }

    if (body.action === 'receive') {
      const remaining = item.neededQuantity - qty;

      if (item.productId) {
        // Produit fini "Acheté" → distribué en priorité aux commandes/devis liés (Réservé),
        // le reliquat (réassort manuel/seuil) part en Disponible.
        await prisma.purchaseListItem.update({
          where: { id },
          data: { receivedQuantity: { increment: qty }, ...(remaining <= 0 ? { status: 'RECU' } : {}) },
        });
        await distributePurchase(id, qty, item.productId);
        if (remaining > 0) await prisma.purchaseListItem.update({ where: { id }, data: { neededQuantity: remaining } });
      } else {
        // Matière première → toujours en Disponible ; débloque les productions en attente.
        await prisma.$transaction([
          prisma.purchaseListItem.update({
            where: { id },
            data: { receivedQuantity: { increment: qty }, ...(remaining <= 0 ? { status: 'RECU' } : { neededQuantity: remaining }) },
          }),
          prisma.rawMaterial.update({ where: { id: item.rawMaterialId! }, data: { available: { increment: qty } } }),
        ]);
        await unblockProductionForMaterial(item.rawMaterialId!);
      }

      const updated = await prisma.purchaseListItem.findUnique({ where: { id } });
      const label = item.product?.reference ?? item.rawMaterial?.reference;
      createAudit({ userId: session?.user?.id, action: `Réception validée (+${qty})`, entity: 'STOCK', entityId: id, detail: `${label}` });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Action invalide ('order' | 'receive')" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update purchase list item' }, { status: 500 });
  }
}

// DELETE /api/purchase-list/[id] — retirer une ligne de la liste
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    await prisma.purchaseListItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete purchase list item' }, { status: 500 });
  }
}
