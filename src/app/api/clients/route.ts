import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { resolveClientVisibility } from '@/lib/leave';

// GET /api/clients — liste tous les clients (permission voir_clients)
// GET /api/clients?light=true — liste légère (autocomplete lors de la création
//   d'une commande), accessible avec voir_commandes. Les employés ne voient que leurs clients.
export async function GET(request: NextRequest) {
  const light = request.nextUrl.searchParams.get('light') === 'true';

  if (light) {
    const guard = await requirePermission('voir_commandes');
    if (guard.error) return guard.error;

    try {
      let whereClause: any = {};

      // Sécurité serveur : un EMPLOYEE ne voit que ses clients assignés (+ ceux
      // confiés pour la durée d'un congé dont il est remplaçant) — cf. src/lib/leave.ts.
      if (guard.session!.user.role !== 'ADMIN') {
        const { visibleClientIds } = await resolveClientVisibility(guard.session!.user.id);
        whereClause = { id: { in: visibleClientIds } };
      }

      const clients = await prisma.client.findMany({
        where: whereClause,
        select: {
          id: true, name: true, company: true, email: true, wilaya: true, commune: true, assignedToId: true,
          phones: { where: { primary: true }, select: { number: true } },
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(clients.map((c) => ({
        id: c.id, name: c.name, company: c.company, email: c.email,
        wilaya: c.wilaya, commune: c.commune, assignedToId: c.assignedToId,
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

  // Sécurité serveur : un EMPLOYEE ne voit que ses clients assignés (+ intérim) —
  // cf. commentaire équivalent sur la branche ?light=true plus haut.
  let visibilityFilter: any = undefined;
  if (guard.session!.user.role !== 'ADMIN') {
    const { visibleClientIds } = await resolveClientVisibility(guard.session!.user.id);
    visibilityFilter = { id: { in: visibleClientIds } };
  }

  try {
    const clients = await prisma.client.findMany({
      where: includeInactifs
        ? visibilityFilter
        : { active: true, ...(visibilityFilter ?? {}) },
      include: {
        deactivatedBy: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
        sector: { select: { id: true, name: true } },
        phones: true,
        _count: { select: { orders: true, quotes: true } },
        orders: {
          select: {
            id: true, ref: true, createdAt: true, status: true, source: true,
            assignedTo: { select: { id: true, name: true } },
            items: {
              select: {
                quantity: true, unitPrice: true, description: true, metrage: true,
                product: { select: { reference: true } },
                stockPath: true, resolvedQuantity: true,
                purchaseListItem: { select: { status: true } },
                productionListItem: { select: { status: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quotes: {
          select: {
            id: true, ref: true, createdAt: true, status: true, proposedPrice: true, source: true,
            assignedTo: { select: { id: true, name: true } },
            items: {
              select: {
                quantity: true, description: true, metrage: true,
                product: { select: { reference: true } },
                stockPath: true, resolvedQuantity: true,
                purchaseListItem: { select: { status: true } },
                productionListItem: { select: { status: true } },
              },
            },
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
