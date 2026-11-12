import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, seesAll } from '@/lib/permissions';
import { resolveClientVisibility } from '@/lib/leave';
import { WHERE_HORS_ROLLINK } from '@/lib/order-filters';

// GET /api/documents/sources?q= — recherche d'une commande ou d'un devis (par référence, client ou entreprise)
// pour y créer un document depuis la page Documents. Mêmes règles de visibilité que la liste des commandes.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!hasPermission(session.user as never, 'voir_commandes')) return NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 });

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  const text = q ? {
    OR: [
      { ref: { contains: q, mode: 'insensitive' as const } },
      { clientName: { contains: q, mode: 'insensitive' as const } },
      { clientCompany: { contains: q, mode: 'insensitive' as const } },
      { client: { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { company: { contains: q, mode: 'insensitive' as const } }] } },
    ],
  } : {};

  const and: Prisma.OrderWhereInput[] = [text];
  if (!seesAll(session.user)) {
    const userId = session.user.id;
    const { historyClientIds, interimSince } = await resolveClientVisibility(userId);
    and.push({ OR: [{ assignedToId: userId }, { clientId: { in: historyClientIds } }, ...interimSince.map(({ clientId, since }) => ({ clientId, createdAt: { gte: since } }))] });
  }

  try {
    const [orders, quotes] = await Promise.all([
      prisma.order.findMany({
        where: { ...WHERE_HORS_ROLLINK, AND: and }, orderBy: { createdAt: 'desc' }, take: 15,
        select: { id: true, ref: true, status: true, createdAt: true, clientName: true, clientCompany: true, client: { select: { name: true, company: true } }, items: { select: { quantity: true } } },
      }),
      prisma.quote.findMany({
        where: { ...(WHERE_HORS_ROLLINK as Prisma.QuoteWhereInput), AND: and as Prisma.QuoteWhereInput[] }, orderBy: { createdAt: 'desc' }, take: 15,
        select: { id: true, ref: true, status: true, createdAt: true, clientName: true, clientCompany: true, client: { select: { name: true, company: true } }, items: { select: { quantity: true } } },
      }),
    ]);
    const map = (kind: 'order' | 'quote') => (r: (typeof orders)[number]) => ({
      kind, id: r.id, ref: r.ref ?? r.id.slice(0, 8).toUpperCase(), status: r.status, createdAt: r.createdAt,
      client: r.clientCompany || r.client?.company || r.clientName || r.client?.name || '—',
      quantity: r.items.reduce((s, i) => s + (i.quantity || 0), 0),
    });
    const items = [...orders.map(map('order')), ...quotes.map(map('quote'))].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[documents/sources]', e);
    return NextResponse.json({ error: 'Recherche impossible' }, { status: 500 });
  }
}
