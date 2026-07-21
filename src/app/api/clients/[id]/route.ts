import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { notifyDeletion } from '@/lib/notify-activity';
import { createNotif } from '@/lib/notifications';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id] — fiche client complète (permission voir_clients)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_clients');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        phones: true,
        notes: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        orders: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          include: { items: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
        },
        contacts: { orderBy: { createdAt: 'desc' } },
        _count: { select: { orders: true, quotes: true } },
      },
    });

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    return NextResponse.json(client);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}

// PATCH /api/clients/[id] — modifier infos client (permission modifier_clients)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.company !== undefined && { company: body.company }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.wilaya !== undefined && { wilaya: body.wilaya }),
        ...(body.commune !== undefined && { commune: body.commune }),
        ...(body.sectorId !== undefined && { sectorId: body.sectorId || null }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.photo !== undefined && { photo: body.photo }),
        // Réactivation → efface les infos de désactivation
        ...(body.active === true && { active: true, deactivatedReason: null, deactivatedById: null, deactivatedAt: null }),
      },
      include: { phones: true, _count: { select: { orders: true, quotes: true } } },
    });

    if (body.phone !== undefined) {
      const existing = await prisma.clientPhone.findFirst({ where: { clientId: id, primary: true } });
      if (existing) {
        await prisma.clientPhone.update({ where: { id: existing.id }, data: { number: body.phone } });
      } else if (body.phone) {
        await prisma.clientPhone.create({ data: { clientId: id, number: body.phone, label: 'Principal', primary: true } });
      }
    }

    createAudit({ userId: session.user.id, action: 'Client modifié', entity: 'CLIENT', entityId: id, detail: client.company ? `${client.name} (${client.company})` : client.name });
    return NextResponse.json(client);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}

// DELETE /api/clients/[id] — par défaut DÉSACTIVE le client (l'historique reste).
//   Body { reason } obligatoire. Les admins reçoivent une notif.
//   ?definitif=true (ADMIN uniquement) → suppression réelle.
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const session = guard.session;
  const definitif = request.nextUrl.searchParams.get('definitif') === 'true';

  const { id } = await params;

  try {
    const target = await prisma.client.findUnique({ where: { id }, select: { name: true, company: true } });
    if (!target) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    const label = target.company ?? target.name;

    // ─── Suppression définitive (ADMIN uniquement) ───
    if (definitif) {
      if ((session.user as { role?: string }).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Seul un admin peut supprimer définitivement un client' }, { status: 403 });
      }
      await prisma.client.delete({ where: { id } });
      createAudit({ userId: session.user.id, action: 'Client supprimé définitivement', entity: 'CLIENT', entityId: id, detail: label });
      notifyDeletion({
        actorId: session.user.id!, actorName: session.user.name ?? session.user.email ?? 'Admin',
        entityType: 'client', label,
      }).catch(() => {});
      return NextResponse.json({ success: true, deleted: true });
    }

    // ─── Désactivation (motif obligatoire) ───
    let reason = '';
    try { const body = await request.json(); reason = (body?.reason ?? '').trim(); } catch { /* pas de body */ }
    if (!reason) return NextResponse.json({ error: 'Le motif de désactivation est obligatoire' }, { status: 400 });

    await prisma.client.update({
      where: { id },
      data: {
        active: false,
        deactivatedReason: reason,
        deactivatedById: session.user.id,
        deactivatedAt: new Date(),
      },
    });

    createAudit({ userId: session.user.id, action: 'Client désactivé', entity: 'CLIENT', entityId: id, detail: `${label} — ${reason}` });

    // Notif claire aux admins
    const actorName = session.user.name ?? session.user.email ?? 'Un membre';
    createNotif({
      type: 'ANNULATION',
      title: 'Client désactivé',
      message: `${actorName} a désactivé le client ${label} — motif : ${reason}`,
      actorId: session.user.id,
      adminOnly: true,
      clientId: id,
    }).catch(() => {});

    return NextResponse.json({ success: true, deactivated: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to deactivate client' }, { status: 500 });
  }
}
