import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, seesAll } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { resolveClientVisibility } from '@/lib/leave';
import { CLIENT_RECORD_INCLUDE } from '@/lib/client-queries';

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
      if (!seesAll(guard.session!.user)) {
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
  if (!seesAll(guard.session!.user)) {
    const { visibleClientIds } = await resolveClientVisibility(guard.session!.user.id);
    visibilityFilter = { id: { in: visibleClientIds } };
  }

  const sp = request.nextUrl.searchParams;

  // ?mini=true — liste minimale (id, nom, entreprise, commercial, téléphones) pour les écrans qui
  // n'ont besoin que d'un sélecteur ou d'un contrôle de doublon (pas d'historique, pas de photo).
  if (sp.get('mini') === 'true') {
    const miniWhere = includeInactifs ? (visibilityFilter ?? {}) : { active: true, ...(visibilityFilter ?? {}) };
    try {
      const rows = await prisma.client.findMany({
        where: miniWhere,
        select: { id: true, name: true, company: true, assignedToId: true, phones: { select: { number: true } } },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(rows);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
  }

  // ?page=true — page de cartes pour /admin/clients : filtres + tri + pagination CÔTÉ SERVEUR
  // (skip/take). Renvoie { items, total, totalAll } ; chaque item est une carte légère
  // (sans historique — la fiche le charge à l'ouverture via /api/clients/[id]?record=true).
  if (sp.get('page') === 'true') {
    try {
      const skip = Math.max(0, parseInt(sp.get('skip') ?? '0', 10) || 0);
      const take = Math.min(200, Math.max(1, parseInt(sp.get('take') ?? '20', 10) || 20));
      const search = (sp.get('search') ?? '').trim();
      const sector = sp.get('sector') ?? 'all';
      const actif = sp.get('actif') ?? 'actifs';
      const sort = sp.get('sort') ?? 'recent';
      const mine = sp.get('mine') === 'true';

      const and: any[] = [];
      if (visibilityFilter) and.push(visibilityFilter);
      const base = and.length ? { AND: and } : {};
      const filters: any[] = [...and];
      if (search) filters.push({ OR: [
        { company: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { wilaya: { contains: search, mode: 'insensitive' } },
      ] });
      if (sector === 'none') filters.push({ sectorId: null });
      else if (sector !== 'all') filters.push({ sectorId: sector });
      if (actif === 'inactifs') filters.push({ active: false });
      else if (actif !== 'tous') filters.push({ active: true });
      if (mine) filters.push({ assignedToId: guard.session!.user.id });

      // 1) Passe légère sur TOUS les clients filtrés (quelques champs scalaires) : sert au tri
      //    (nom, wilaya, nb de demandes, dernière activité) et au total. 2) Détails de la page seule.
      const [totalAll, lite] = await Promise.all([
        prisma.client.count({ where: base }),
        prisma.client.findMany({
          where: filters.length ? { AND: filters } : {},
          select: { id: true, name: true, company: true, wilaya: true, _count: { select: { orders: true, quotes: true } } },
        }),
      ]);

      const ids = lite.map((c) => c.id);
      const lastActivity = new Map<string, number>();
      if (sort === 'recent' && ids.length) {
        const [lo, lq] = await Promise.all([
          prisma.order.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _max: { createdAt: true } }),
          prisma.quote.groupBy({ by: ['clientId'], where: { clientId: { in: ids } }, _max: { createdAt: true } }),
        ]);
        for (const g of [...lo, ...lq]) {
          const t = g._max.createdAt?.getTime() ?? 0;
          if (g.clientId && t > (lastActivity.get(g.clientId) ?? 0)) lastActivity.set(g.clientId, t);
        }
      }

      const label = (c: { company: string | null; name: string }) => c.company || c.name;
      lite.sort((a, b) => {
        switch (sort) {
          case 'nom':       return label(a).localeCompare(label(b));
          case 'commandes': return (b._count.orders + b._count.quotes) - (a._count.orders + a._count.quotes);
          case 'wilaya':    return (a.wilaya || '').localeCompare(b.wilaya || '');
          default:          return (lastActivity.get(b.id) ?? 0) - (lastActivity.get(a.id) ?? 0);
        }
      });

      const pageIds = lite.slice(skip, skip + take).map((c) => c.id);
      const rows = pageIds.length ? await prisma.client.findMany({
        where: { id: { in: pageIds } },
        omit: { photo: true },
        include: {
          deactivatedBy: { select: { name: true } },
          assignedTo: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true } },
          phones: true,
          _count: { select: { orders: true, quotes: true } },
        },
      }) : [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      const items = pageIds.map((id) => byId.get(id)).filter(Boolean).map((r) => ({
        ...r,
        lastActivityAt: lastActivity.get(r!.id) ? new Date(lastActivity.get(r!.id)!).toISOString() : null,
      }));
      return NextResponse.json({ items, total: lite.length, totalAll });
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }
  }

  try {
    const clients = await prisma.client.findMany({
      where: includeInactifs
        ? visibilityFilter
        : { active: true, ...(visibilityFilter ?? {}) },
      // photo (base64) chargée à la demande via /api/clients/[id]?photoOnly=true
      omit: { photo: true },
      include: CLIENT_RECORD_INCLUDE,
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
