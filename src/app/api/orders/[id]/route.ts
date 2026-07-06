import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAudit, statusLabel } from '@/lib/audit';
import { notifyStatusChange } from '@/lib/notify-activity';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/orders/[id] — détail commande (admin + employé)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

// PATCH /api/orders/[id] — modifier statut / notes (admin + employé)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();

    // Mise à jour des prix unitaires par produit si fournis
    if (body.itemPrices && Array.isArray(body.itemPrices)) {
      const existing = await prisma.orderItem.findMany({ where: { orderId: id }, include: { product: true } });
      await Promise.all(body.itemPrices.map(async (ip: { designation: string; unitPrice: number }) => {
        const match = existing.find(e => e.product?.reference === ip.designation);
        if (match) await prisma.orderItem.update({ where: { id: match.id }, data: { unitPrice: ip.unitPrice } });
      }));
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.totalOverride !== undefined && { notes: `TOTAL:${body.totalOverride}${body.notes ? '\n' + body.notes : ''}` }),
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const action = body.status !== undefined ? `Statut commande : ${statusLabel(body.status)}` : 'Commande modifiée';
    createAudit({ userId: session.user.id, action, entity: 'COMMANDE', entityId: id, orderId: id });

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

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
