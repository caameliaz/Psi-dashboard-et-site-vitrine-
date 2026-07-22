import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { createAudit, statusLabel } from '@/lib/audit';
import { createNotif } from '@/lib/notifications';
import { notifyStatusChange, notifyAssignment } from '@/lib/notify-activity';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/orders/[id] — détail commande (permission voir_commandes)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — modifier statut / notes / prix (permission modifier_statuts)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_statuts');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    // Changement d'assignation ("pris en charge par") → nécessite la permission assign_commandes
    if (body.assignedToId !== undefined && !hasPermission(session.user as any, 'assign_commandes')) {
      return NextResponse.json({ error: "Vous n'avez pas la permission d'assigner" }, { status: 403 });
    }

    // Ré-assigner la commande à un autre client → nécessite reassigner_client
    if (body.clientId !== undefined && !hasPermission(session.user as any, 'reassigner_client')) {
      return NextResponse.json({ error: "Vous n'avez pas la permission de ré-assigner le client" }, { status: 403 });
    }

    // Mise à jour des prix unitaires par produit si fournis
    if (body.itemPrices && Array.isArray(body.itemPrices)) {
      const existing = await prisma.orderItem.findMany({ where: { orderId: id }, include: { product: true } });
      await Promise.all(body.itemPrices.map(async (ip: { designation: string; unitPrice: number }) => {
        const match = existing.find(e => e.product?.reference === ip.designation);
        if (match) await prisma.orderItem.update({ where: { id: match.id }, data: { unitPrice: ip.unitPrice } });
      }));
    }

    // Remplacement complet des lignes de la commande (bouton "Modifier")
    // body.items = [{ productId | description, quantity, unitPrice, metrage }] — pas de modif si livrée/annulée
    if (body.items && Array.isArray(body.items)) {
      const current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
      if (current && (current.status === 'LIVRE' || current.status === 'ANNULE')) {
        return NextResponse.json({ error: 'Impossible de modifier une commande livrée ou annulée' }, { status: 409 });
      }
      // Une référence LIBRE n'a pas de productId : son libellé est dans `description`.
      // (avant, ces lignes étaient filtrées → elles disparaissaient à chaque modification)
      const validItems = (body.items as { productId?: string; description?: string; quantity?: number; unitPrice?: number; metrage?: number }[])
        .filter((it) => (it.productId || (it.description && it.description.trim() !== '')) && (it.quantity ?? 0) > 0);
      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      if (validItems.length > 0) {
        await prisma.orderItem.createMany({
          data: validItems.map((it) => ({
            orderId: id,
            productId: it.productId || null,
            description: it.productId ? null : (it.description ?? null),
            quantity: it.quantity!,
            unitPrice: it.unitPrice ?? 0,
            metrage: it.metrage ?? null,
          })),
        });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
        ...(body.clientId !== undefined && { clientId: body.clientId || null }),
        ...(body.totalOverride !== undefined && { notes: `TOTAL:${body.totalOverride}${body.notes ? '\n' + body.notes : ''}` }),
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const action = body.status !== undefined ? `Statut commande : ${statusLabel(body.status)}` : 'Commande modifiée';
    const orderLabel = order.clientCompany || order.clientName || order.client?.name || '';
    createAudit({ userId: session.user.id, action, entity: 'COMMANDE', entityId: id, detail: orderLabel ? `${order.ref} — ${orderLabel}` : order.ref, orderId: id });

    // Modification des PRODUITS (sans changement de statut) → on prévient quand même :
    // admins + employé assigné, comme pour les autres actions sur la commande.
    if (body.items !== undefined && body.status === undefined) {
      createNotif({
        type: 'ACTION_AUTRE',
        title: 'Commande modifiée',
        message: `${session.user.name ?? session.user.email ?? 'Un membre'} a modifié les produits de la commande ${order.ref}${orderLabel ? ` — ${orderLabel}` : ''}`,
        actorId: session.user.id,
        orderId: order.id,
      }).catch(() => {});
    }

    if (body.status !== undefined) {
      notifyStatusChange({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        entityType: 'commande',
        clientLabel: order.client?.company ?? order.client?.name ?? '—',
        newStatus: body.status,
        orderId: order.id,
      }).catch(() => {});
    }

    if (body.assignedToId) {
      notifyAssignment({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        assignedToId: body.assignedToId,
        entityType: 'commande',
        clientLabel: order.client?.company ?? order.client?.name ?? '—',
        ref: order.ref ?? order.id.slice(0, 8),
        orderId: order.id,
      }).catch(() => {});
    }

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
