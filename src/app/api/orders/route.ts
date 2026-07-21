import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { generateOrderRef } from '@/lib/generate-ref';
import { pushSSE } from '@/lib/sse-bus';
import { createAudit } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  // ?from=<ISO> → ne renvoie que les commandes créées depuis cette date (perf : filtre par période)
  const fromParam = request.nextUrl.searchParams.get('from');
  const from = fromParam ? new Date(fromParam) : null;

  try {
    const orders = await prisma.order.findMany({
      where: from && !isNaN(from.getTime()) ? { createdAt: { gte: from } } : undefined,
      include: {
        client: { include: { phones: true } },
        items: { include: { product: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'orders', 10, 60_000); // 10 commandes / min / IP
  if (limited) return limited;
  try {
    const body = await request.json();
    const session = await auth();

    const primaryPhone: string = body.client?.phone ?? '';
    const clientName: string = body.client?.name ?? '';
    const clientCompany: string = body.client?.company ?? '';

    // 1. Cherche par téléphone
    let client = primaryPhone
      ? await prisma.client.findFirst({
          where: { phones: { some: { number: primaryPhone } } },
        })
      : null;

    // 2. Sinon cherche par entreprise (si fournie) ou par nom exact
    if (!client) {
      client = await prisma.client.findFirst({
        where: clientCompany
          ? { company: { equals: clientCompany, mode: 'insensitive' } }
          : { name: { equals: clientName, mode: 'insensitive' } },
      });
    }

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: body.client.name,
          company: body.client.company ?? null,
          email: body.client.email ?? null,
          wilaya: body.client.wilaya,
          commune: body.client.commune ?? null,
          address: body.client.address ?? null,
          phones: {
            create: primaryPhone
              ? [{ number: primaryPhone, label: 'Principal', primary: true }]
              : [],
          },
        },
      });
    }

    const VALID_SOURCES = ['SITE', 'ADMIN', 'WHATSAPP', 'TELEPHONE', 'AUTRE'];
    const source = VALID_SOURCES.includes(body.source) ? body.source : 'SITE';

    const ref = await generateOrderRef(client.wilaya);
    const validItems = (body.items ?? []).filter(
      (i: { productId?: string | null; description?: string; quantity?: number }) =>
        ((i.productId && i.productId !== '') || (i.description && i.description.trim() !== '')) && (i.quantity ?? 0) > 0
    );

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'Au moins un produit valide est requis' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        ref,
        clientId: client.id,
        clientName: client.name,
        clientCompany: client.company ?? null,
        clientWilaya: client.wilaya ?? null,
        source: source as any,
        createdById: session?.user?.id ?? null,
        // Assignation : valeur fournie, sinon le créateur (utilisateur connecté)
        assignedToId: body.assignedToId ?? session?.user?.id ?? null,
        items: {
          create: validItems.map((item: { productId?: string | null; description?: string; quantity: number; unitPrice: number; metrage?: number }) => ({
            productId: item.productId || null,
            description: item.productId ? null : (item.description ?? null),
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? 0,
            metrage: item.metrage ?? null,
          })),
        },
      },
      include: { items: true, client: { include: { phones: true } } },
    });

    const isAdmin = body.source !== 'SITE';
    const actorName = session?.user?.name ?? session?.user?.email ?? 'Agent';
    const clientLabel = client.company ?? client.name;
    // Commande du SITE = client externe → actorId null pour que TOUT LE MONDE reçoive la notif.
    const { notif, userIds } = await createNotif({
      type: isAdmin ? 'ACTION_AUTRE' : 'SITE_COMMANDE',
      title: isAdmin ? 'Nouvelle commande · Manuel' : 'Nouvelle commande · Site web',
      message: isAdmin
        ? `${actorName} a créé une commande pour ${clientLabel} (${order.ref ?? ''})`
        : `${clientLabel} a lancé une commande (${order.ref ?? ''})`,
      actorId: isAdmin ? (session?.user?.id ?? null) : null,
      orderId: order.id,
      selfToastMessage: isAdmin ? 'Vous avez créé une commande' : undefined,
    });

    pushSSE('new_order', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
    }, userIds);
    createAudit({
      userId: session?.user?.id,
      action: 'Commande créée',
      entity: 'COMMANDE',
      entityId: order.id,
      detail: `${client.company ?? client.name} — ${validItems.length} article(s)`,
      orderId: order.id,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/orders] ERROR:', error);
    return NextResponse.json({
      error: 'Failed to create order',
      detail: error?.message ?? String(error),
      code: error?.code,
    }, { status: 500 });
  }
}
