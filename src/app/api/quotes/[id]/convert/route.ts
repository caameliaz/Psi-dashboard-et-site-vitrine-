import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyConversion } from '@/lib/notify-activity';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true, client: true },
    });

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    if (quote.status === 'ANNULE') return NextResponse.json({ error: 'Impossible de convertir un devis annulé' }, { status: 409 });
    if (quote.convertedOrderId) return NextResponse.json({ error: 'Devis déjà converti en commande' }, { status: 409 });

    const order = await prisma.order.create({
      data: {
        clientId: quote.clientId,
        clientName: quote.clientName ?? quote.client?.name ?? null,
        clientCompany: quote.clientCompany ?? quote.client?.company ?? null,
        clientWilaya: quote.clientWilaya ?? quote.client?.wilaya ?? null,
        source: quote.source,
        createdById: session.user.id,
        notes: quote.notes ?? null,
        items: {
          create: quote.items
            .filter((item) => item.productId !== null)
            .map((item) => ({
              productId: item.productId!,
              quantity: item.quantity,
              unitPrice: 0,
            })),
        },
      },
    });

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: { status: 'VALIDE', convertedOrderId: order.id },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    const clientLabel = quote.client?.company ?? quote.client?.name ?? quote.clientCompany ?? quote.clientName ?? '—';
    notifyConversion({
      actorId: session.user.id!,
      actorName: session.user.name ?? session.user.email ?? 'Agent',
      clientLabel,
      quoteRef: quote.ref ?? id.slice(0, 8),
      orderId: order.id,
      quoteId: quote.id,
    }).catch(() => {});

    return NextResponse.json({ quote: updatedQuote, order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to convert quote' }, { status: 500 });
  }
}
