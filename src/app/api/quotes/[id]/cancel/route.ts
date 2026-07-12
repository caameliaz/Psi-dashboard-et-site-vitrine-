import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/quotes/[id]/cancel — annuler un devis (permission modifier_statuts)
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

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

    if (existing.status === 'ANNULE') {
      return NextResponse.json({ error: 'Devis déjà annulé' }, { status: 409 });
    }

    const quote = await prisma.quote.update({
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

    createAudit({ userId: session.user.id, action: 'Devis annulé', entity: 'DEVIS', entityId: id, detail: body.cancelReason, quoteId: id });
    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to cancel quote' }, { status: 500 });
  }
}
