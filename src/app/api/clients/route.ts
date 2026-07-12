import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

// GET /api/clients — liste tous les clients (permission voir_clients)
export async function GET() {
  const guard = await requirePermission('voir_clients');
  if (guard.error) return guard.error;

  try {
    const clients = await prisma.client.findMany({
      include: {
        phones: true,
        _count: { select: { orders: true, quotes: true } },
        orders: {
          select: {
            id: true, ref: true, createdAt: true, status: true,
            items: { select: { quantity: true, unitPrice: true, product: { select: { reference: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quotes: {
          select: {
            id: true, ref: true, createdAt: true, status: true,
            items: { select: { quantity: true, product: { select: { reference: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(clients);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST /api/clients — créer un nouveau client (permission modifier_clients)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'name est requis' }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        name: body.name,
        company: body.company ?? null,
        email: body.email ?? null,
        wilaya: body.wilaya ?? null,
        commune: body.commune ?? null,
        address: body.address ?? null,
        ...(body.phone ? {
          phones: { create: [{ number: body.phone, label: 'Principal', primary: true }] },
        } : {}),
      },
      include: { phones: true, _count: { select: { orders: true, quotes: true } } },
    });

    createAudit({ userId: session.user.id, action: 'Client créé', entity: 'CLIENT', entityId: client.id, detail: client.company ? `${client.name} (${client.company})` : client.name });
    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
