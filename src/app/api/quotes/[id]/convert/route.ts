import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/quotes/[id]/convert — convertir un devis en commande
export async function PATCH(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
    if (quote.status === 'ANNULE') return NextResponse.json({ error: 'Impossible de convertir un devis annulé' }, { status: 409 });
    if (quote.convertedOrderId) return NextResponse.json({ error: 'Devis déjà converti en commande' }, { status: 409 });

    // Créer la commande à partir du devis
    // unitPrice = 0 : à saisir manuellement via PATCH /api/orders/[id]
    // car proposedPrice est un total global, pas un prix par item
    const order = await prisma.order.create({
      data: {
        clientId: quote.clientId,
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

    // Lier le devis à la commande créée et passer en VALIDE
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'VALIDE',
        convertedOrderId: order.id,
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    createAudit({ userId: session.user.id, action: 'Devis converti en commande', entity: 'DEVIS', entityId: id, detail: `Commande créée : ${order.id}`, quoteId: id, orderId: order.id });
    return NextResponse.json({ quote: updatedQuote, order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to convert quote' }, { status: 500 });
  }
}
