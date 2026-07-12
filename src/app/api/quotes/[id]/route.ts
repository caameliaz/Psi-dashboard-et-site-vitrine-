import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { createAudit, statusLabel } from '@/lib/audit';
import { notifyStatusChange, notifyAssignment } from '@/lib/notify-activity';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/quotes/[id] — détail devis (permission voir_commandes)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

// PATCH /api/quotes/[id] — modifier statut / champs admin / notes (permission modifier_statuts)
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

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
        ...(body.proposedPrice !== undefined && { proposedPrice: Number(body.proposedPrice) }),
        ...(body.deliveryDelay !== undefined && { deliveryDelay: body.deliveryDelay }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms }),
        ...(body.adminRemarks !== undefined && { adminRemarks: body.adminRemarks }),
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const action = body.status !== undefined ? `Statut devis : ${statusLabel(body.status)}` : 'Devis modifié';
    createAudit({ userId: session.user.id, action, entity: 'DEVIS', entityId: id, quoteId: id });

    if (body.status !== undefined) {
      notifyStatusChange({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        entityType: 'devis',
        clientLabel: quote.client?.company ?? quote.client?.name ?? '—',
        newStatus: body.status,
        quoteId: quote.id,
      }).catch(() => {});
    }

    if (body.assignedToId) {
      notifyAssignment({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        assignedToId: body.assignedToId,
        entityType: 'devis',
        clientLabel: quote.client?.company ?? quote.client?.name ?? '—',
        ref: quote.ref ?? quote.id.slice(0, 8),
        quoteId: quote.id,
      }).catch(() => {});
    }

    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
