import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { notifyDeletion } from '@/lib/notify-activity';

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
        ...(body.address !== undefined && { address: body.address }),
        ...(body.photo !== undefined && { photo: body.photo }),
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

// DELETE /api/clients/[id] — supprime le client, les commandes/devis restent (clientId → null)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const target = await prisma.client.findUnique({ where: { id }, select: { name: true, company: true } });
    if (!target) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });

    await prisma.client.delete({ where: { id } });

    createAudit({ userId: session.user.id, action: 'Client supprimé', entity: 'CLIENT', entityId: id, detail: target.company ? `${target.name} (${target.company})` : target.name });

    notifyDeletion({
      actorId: session.user.id!,
      actorName: session.user.name ?? session.user.email ?? 'Admin',
      entityType: 'client',
      label: target.company ?? target.name,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
