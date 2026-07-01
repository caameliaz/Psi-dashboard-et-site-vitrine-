import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { generateOrderRef } from '@/lib/generate-ref';
import { pushSSE } from '@/lib/sse-bus';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const orders = await prisma.order.findMany({
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
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
  try {
    const body = await request.json();
    const session = await auth();

    console.log('[POST /api/orders] body:', JSON.stringify(body, null, 2));

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
          address: body.client.address ?? null,
          phones: {
            create: primaryPhone
              ? [{ number: primaryPhone, label: 'Principal', primary: true }]
              : [],
          },
        },
      });
    }

    const ref = await generateOrderRef(client.wilaya);
    const validItems = (body.items ?? []).filter(
      (i: { productId?: string | null; quantity?: number }) =>
        i.productId && i.productId !== '' && (i.quantity ?? 0) > 0
    );

    console.log('[POST /api/orders] validItems:', JSON.stringify(validItems));

    const order = await prisma.order.create({
      data: {
        ref,
        clientId: client.id,
        source: body.source ?? 'SITE',
        createdById: session?.user?.id ?? null,
        ...(validItems.length > 0 && {
          items: {
            create: validItems.map((item: { productId: string; quantity: number; unitPrice?: number }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? 0,
            })),
          },
        }),
      },
      include: { items: true, client: { include: { phones: true } } },
    });

    const isAdmin = body.source !== 'SITE';
    const actorName = session?.user?.name ?? session?.user?.email ?? 'Agent';
    const clientLabel = client.company ?? client.name;
    const notif = await createNotif({
      type: isAdmin ? 'ACTION_AUTRE' : 'SITE_COMMANDE',
      title: isAdmin ? 'Nouvelle commande · Manuel' : 'Nouvelle commande · Site web',
      message: isAdmin
        ? `${actorName} a créé une commande pour ${clientLabel} (${order.ref ?? ''})`
        : `${clientLabel} — ${body.items?.length ?? 0} article(s)`,
      orderId: order.id,
    });

    pushSSE('new_order', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('[POST /api/orders] ERROR:', error);
    return NextResponse.json({ error: 'Failed to create order', detail: String(error) }, { status: 500 });
  }
}
