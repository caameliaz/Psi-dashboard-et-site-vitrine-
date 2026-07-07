import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/orders/[id]/cancel — annuler une commande (permission modifier_statuts)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_statuts');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    if (!body.cancelReason) {
      return NextResponse.json({ error: 'Un justificatif est requis pour annuler' }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    if (existing.status === 'ANNULE') {
      return NextResponse.json({ error: 'Commande déjà annulée' }, { status: 409 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'ANNULE',
        cancelReason: body.cancelReason,
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    createAudit({ userId: session.user.id, action: 'Commande annulée', entity: 'COMMANDE', entityId: id, detail: body.cancelReason, orderId: id });
    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
