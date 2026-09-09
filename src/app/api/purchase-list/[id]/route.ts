import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { distributePurchase, unblockProductionForMaterial, resyncPurchaseLineForProduct, resyncMaterialPurchaseNeed } from '@/lib/order-stock';

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
      // Rejouable plusieurs fois sur la même ligne (ex: une carte déjà "Commandé" à qui il
      // reste du manquant — nouveau besoin apparu depuis, ou commande fournisseur fractionnée).
      // Seule la quantité réellement commandée MAINTENANT sort du manquant (besoin d'abord,
      // puis buffer) — jamais tout le buffer d'un coup, peu importe ce qui est saisi.
      const outstanding = item.neededQuantity + item.bufferQuantity;
      if (qty > outstanding) {
        return NextResponse.json({ error: `Quantité supérieure au manquant actuel (${outstanding})` }, { status: 400 });
      }
      const fromNeeded = Math.min(item.neededQuantity, qty);
      const fromBuffer = Math.min(item.bufferQuantity, qty - fromNeeded);
      const updated = await prisma.purchaseListItem.update({
        where: { id },
        data: {
          neededQuantity: item.neededQuantity - fromNeeded,
          bufferQuantity: item.bufferQuantity - fromBuffer,
          orderedQuantity: { increment: qty },
          status: 'COMMANDE',
        },
      });
      const label = item.product?.reference ?? item.rawMaterial?.reference;
      createAudit({ userId: session?.user?.id, action: `Commande fournisseur passée (${qty})`, entity: 'STOCK', entityId: id, detail: `${label}` });
      return NextResponse.json(updated);
    }

    if (body.action === 'receive') {
      if (item.productId) {
        // Produit fini "Acheté" → distribué en priorité aux commandes/devis liés (Réservé,
        // FIFO), le reliquat (réassort manuel/seuil) part en Disponible.
        await prisma.purchaseListItem.update({ where: { id }, data: { receivedQuantity: { increment: qty } } });
        await distributePurchase(id, qty, item.productId);
        // Besoin réel dérivé des commandes restantes + buffer recalculés entièrement à neuf.
        await resyncPurchaseLineForProduct(item.productId);
      } else {
        // Matière première → toujours en Disponible ; débloque les productions en attente.
        await prisma.$transaction([
          prisma.purchaseListItem.update({ where: { id }, data: { receivedQuantity: { increment: qty } } }),
          prisma.rawMaterial.update({ where: { id: item.rawMaterialId! }, data: { available: { increment: qty } } }),
        ]);
        await unblockProductionForMaterial(item.rawMaterialId!);
        // Le disponible de CETTE matière a bougé → recalcul immédiat de sa propre ligne
        // (besoin réel + buffer), même si aucune ligne de production n'a été débloquée.
        await resyncMaterialPurchaseNeed(item.rawMaterialId!);
      }

      // "Reçu" seulement quand il ne manque plus RIEN du tout — besoin ET buffer à 0 (pas
      // seulement le besoin, sinon une carte avec du buffer restant ne passait jamais Reçu
      // et polluait la liste indéfiniment, même une fois tout ce qui était commandé arrivé).
      const afterResync = await prisma.purchaseListItem.findUnique({ where: { id } });
      if (afterResync && afterResync.status !== 'RECU' && afterResync.neededQuantity <= 0 && afterResync.bufferQuantity <= 0) {
        await prisma.purchaseListItem.update({ where: { id }, data: { status: 'RECU' } });
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
