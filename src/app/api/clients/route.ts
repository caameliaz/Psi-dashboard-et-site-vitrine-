import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

// GET /api/clients — liste tous les clients (permission voir_clients)
// GET /api/clients?light=true — liste légère (autocomplete lors de la création
//   d'une commande), accessible avec voir_commandes. Les employés ne voient que leurs clients.
export async function GET(request: NextRequest) {
  const light = request.nextUrl.searchParams.get('light') === 'true';
  const assignedToIdParam = request.nextUrl.searchParams.get('assignedToId');

  if (light) {
    const guard = await requirePermission('voir_commandes');
    if (guard.error) return guard.error;
    
    try {
      let whereClause: any = {};
      
      // Si assignedToId est fourni, filtrer les clients qui ont des commandes/devis assignés à cet utilisateur
      if (assignedToIdParam) {
        whereClause = {
          OR: [
            { orders: { some: { assignedToId: assignedToIdParam } } },
            { quotes: { some: { assignedToId: assignedToIdParam } } },
          ],
        };
      }
      
      const clients = await prisma.client.findMany({
        where: whereClause,
        select: {
          id: true, name: true, company: true, email: true, wilaya: true, commune: true,
          phones: { where: { primary: true }, select: { number: true } },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(clients.map((c) => ({
        id: c.id, name: c.name, company: c.company, email: c.email,
        wilaya: c.wilaya, commune: c.commune,
        phone: c.phones[0]?.number ?? '',
      })));
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
  }

  const guard = await requirePermission('voir_clients');
  if (guard.error) return guard.error;

  // Par défaut on masque les clients désactivés ; ?inactifs=true pour les inclure
  const includeInactifs = request.nextUrl.searchParams.get('inactifs') === 'true';

  try {
    const clients = await prisma.client.findMany({
      where: includeInactifs ? undefined : { active: true },
      include: {
        deactivatedBy: { select: { name: true } },
        sector: { select: { id: true, name: true } },
        phones: true,
        _count: { select: { orders: true, quotes: true } },
        orders: {
          select: {
            id: true, ref: true, createdAt: true, status: true, source: true,
            assignedTo: { select: { id: true, name: true } },
            items: { select: { quantity: true, unitPrice: true, description: true, metrage: true, product: { select: { reference: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quotes: {
          select: {
            id: true, ref: true, createdAt: true, status: true, proposedPrice: true, source: true,
            assignedTo: { select: { id: true, name: true } },
            items: { select: { quantity: true, description: true, metrage: true, product: { select: { reference: true } } } },
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
        sectorId: body.sectorId || null,
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
