import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { generateOrderRef } from '@/lib/generate-ref';
import { notifyClients } from '@/app/api/sse/route';
import { createAudit } from '@/lib/audit';

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

    const VALID_SOURCES = ['SITE', 'ADMIN', 'WHATSAPP', 'TELEPHONE', 'AUTRE'];
    const source = VALID_SOURCES.includes(body.source) ? body.source : 'SITE';

    const validItems = (body.items ?? []).filter(
      (item: { productId?: string; quantity: number; unitPrice: number }) => item.productId
    );
    if (validItems.length === 0) {
      return NextResponse.json({ error: 'Au moins un produit valide est requis' }, { status: 400 });
    }

    const ref = await generateOrderRef(client.wilaya);
    const order = await prisma.order.create({
      data: {
        ref,
        clientId: client.id,
        source: source as any,
        createdById: session?.user?.id ?? null,
        items: {
          create: validItems.map((item: { productId: string; quantity: number; unitPrice: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { items: true, client: { include: { phones: true } } },
    });

    await createNotif({
      type: 'SITE_COMMANDE',
      title: 'Nouvelle commande',
      message: `${client.company ?? client.name} — ${body.items?.length ?? 0} article(s)`,
      orderId: order.id,
    });

    createAudit({
      userId: session?.user?.id,
      action: 'Commande créée',
      entity: 'COMMANDE',
      entityId: order.id,
      detail: `${client.company ?? client.name} — ${validItems.length} article(s)`,
      orderId: order.id,
    });
    notifyClients('new_order');
    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({
      error: 'Failed to create order',
      detail: error?.message ?? String(error),
      code: error?.code,
    }, { status: 500 });
  }
}
