import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/orders/[id]/cancel — annuler une commande avec justificatif
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
