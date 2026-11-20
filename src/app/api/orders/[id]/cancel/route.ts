import { NextRequest, NextResponse } from 'next/server';
import { scanLowStock } from '@/lib/low-stock';
import { prisma } from '@/lib/prisma';
import { guardRequestAccess } from '@/lib/access';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { cancelStock } from '@/lib/order-stock';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/orders/[id]/cancel — annuler une commande (permission modifier_statuts)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const guard = await guardRequestAccess('modifier_statuts', 'order', id);
  if (guard.error) return guard.error;
  const session = guard.session;

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
    // Livrée/retournée : la marchandise est déjà sortie, annuler remettrait du stock « fantôme » en disponible
    if (existing.status === 'LIVRE' || existing.status === 'RETOURNE') {
      return NextResponse.json({ error: 'Une commande livrée ou retournée ne peut pas être annulée (utilisez « Retourné »)' }, { status: 409 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'ANNULE',
        cancelReason: body.cancelReason,
      },
      include: {
        client: { omit: { photo: true }, include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    createAudit({ userId: session.user.id, action: 'Commande annulée', entity: 'COMMANDE', entityId: id, detail: body.cancelReason, orderId: id });

    try { await cancelStock('order', id); } catch (stockError) { console.error('[orders/cancel] Erreur de mise à jour du stock :', stockError); }

    await scanLowStock();
    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
