import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { distributePurchase, unblockProductionForMaterial, resyncPurchaseLineForProduct, resyncMaterialPurchaseNeed } from '@/lib/order-stock';
import { createLinkResolver } from '@/lib/stock-traceability';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/purchase-list/[id] — détail d'UNE ligne + "commandes concernées" (qui retient du
// stock/de la matière) — utilisé par le panneau commande/devis (cf. RequestPanel.tsx).
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_stock');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const item = await prisma.purchaseListItem.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, reference: true, name: true, available: true, reserved: true, purchaseThreshold: true } },
        rawMaterial: { select: { id: true, reference: true, name: true, unit: true, available: true, reserved: true, purchaseThreshold: true } },
      },
    });
    if (!item) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 });

    const resolver = createLinkResolver();
    const links = item.rawMaterialId ? await resolver.materialPurchaseLinks(item.rawMaterialId) : await resolver.purchaseLineLinks(item.id);
    // "Qui retient du stock actuellement" — cf. RequestPanel.tsx. N'a de sens que pour un produit
    // (une matière n'est jamais réservée directement par un article de commande/devis).
    const holders = item.productId ? await resolver.productStockHolders(item.productId) : { orderItems: [], quoteItems: [] };

    return NextResponse.json({ ...item, ...links, holders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch purchase list item' }, { status: 500 });
  }
}

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
      // Ne jamais réceptionner plus que ce qui a réellement été commandé, ni sur une ligne
      // dont tout le commandé est déjà arrivé — sinon `receivedQuantity` dépasserait
      // `orderedQuantity` (un en-transit négatif, cf. resyncMaterialPurchaseNeed/
      // resyncPurchaseLineForProduct qui font `Math.max(0, ordered - received)`, ce qui
      // masquerait silencieusement l'anomalie plutôt que de la refuser franchement ici).
      const remainingToReceive = item.orderedQuantity - item.receivedQuantity;
      if (remainingToReceive <= 0) {
        return NextResponse.json({ error: 'Tout ce qui a été commandé est déjà reçu sur cette ligne' }, { status: 400 });
      }
      if (qty > remainingToReceive) {
        return NextResponse.json({ error: `Quantité supérieure à ce qu'il reste à recevoir (${remainingToReceive})` }, { status: 400 });
      }

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
      // et polluait la liste indéfiniment, même une fois tout ce qui était commandé arrivé)
      // ET tout ce qui a été commandé est physiquement arrivé (`received >= ordered`) — sinon,
      // comme l'en-transit (`ordered - received`) compte comme "déjà sécurisé" dans le calcul
      // du besoin (cf. resyncMaterialPurchaseNeed), une réception PARTIELLE minime pourrait
      // suffire à faire retomber besoin+buffer à 0 et fermer la carte à tort, alors qu'il reste
      // encore l'essentiel de la commande à recevoir.
      const afterResync = await prisma.purchaseListItem.findUnique({ where: { id } });
      if (afterResync && afterResync.status !== 'RECU' && afterResync.neededQuantity <= 0 && afterResync.bufferQuantity <= 0 && afterResync.receivedQuantity >= afterResync.orderedQuantity) {
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
