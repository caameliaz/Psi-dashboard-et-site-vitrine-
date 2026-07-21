import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { pushSSE } from '@/lib/sse-bus';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/orders/[id]/notes — fil des notes d'une commande (permission voir_commandes)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;
  const { id: orderId } = await params;
  try {
    const notes = await prisma.requestNote.findMany({
      where: { orderId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/orders/[id]/notes — ajouter une note (permission modifier_statuts)
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_statuts');
  if (guard.error) return guard.error;
  const session = guard.session;
  const { id: orderId } = await params;
  try {
    const body = await request.json();
    const content = (body?.content ?? '').trim();
    if (!content) return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });

    const note = await prisma.requestNote.create({
      data: { orderId, authorId: session.user.id, content },
      include: { author: { select: { id: true, name: true } } },
    });

    // Prévient les admins + l'employé assigné (createNotif cible via orderId)
    const actorName = session.user.name ?? session.user.email ?? 'Un membre';
    const cible = await prisma.order.findUnique({
      where: { id: orderId },
      select: { ref: true, clientName: true, client: { select: { name: true, company: true } } },
    });
    const clientLabel = cible?.client?.company ?? cible?.client?.name ?? cible?.clientName ?? '';
    const extrait = content.length > 60 ? content.slice(0, 60) + '…' : content;

    const { notif, userIds } = await createNotif({
      type: 'ACTION_AUTRE',
      title: 'Nouvelle note · Commande',
      message: `${actorName} a ajouté une note sur la commande ${cible?.ref ?? ''}${clientLabel ? ` — ${clientLabel}` : ''} : « ${extrait} »`,
      actorId: session.user.id,
      orderId,
    });
    pushSSE('note_added', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
    }, userIds);
    createAudit({
      userId: session.user.id,
      action: 'Note ajoutée',
      entity: 'COMMANDE',
      entityId: orderId,
      detail: `${cible?.ref ?? ''} — ${extrait}`,
      orderId,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
