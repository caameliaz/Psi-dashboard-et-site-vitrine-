import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { generateQuoteRef } from '@/lib/generate-ref';
import { pushSSE } from '@/lib/sse-bus';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const quotes = await prisma.quote.findMany({
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await auth();

    const primaryPhone: string = body.phone ?? '';
    const clientName: string = body.name ?? '';
    const clientCompany: string = body.company ?? '';

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
          name: body.name,
          company: body.company ?? null,
          email: body.email ?? null,
          wilaya: body.wilaya ?? 'Non spécifié',
          phones: {
            create: primaryPhone
              ? [{ number: primaryPhone, label: 'Principal', primary: true }]
              : [],
          },
        },
      });
    }

    const ref = await generateQuoteRef(client.wilaya);
    const quote = await prisma.quote.create({
      data: {
        ref,
        clientId: client.id,
        message: body.message ?? '',
        source: body.source ?? 'SITE',
        createdById: session?.user?.id ?? null,
        items: {
          create: (body.items ?? []).map((item: {
            productId?: string;
            description?: string;
            width?: number;
            length?: number;
            quantity: number;
          }) => ({
            productId: item.productId ?? null,
            description: item.description ?? null,
            width: item.width ?? null,
            length: item.length ?? null,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true, client: { include: { phones: true } } },
    });

    const isAdmin = body.source !== 'SITE';
    const actorName = session?.user?.name ?? session?.user?.email ?? 'Agent';
    const clientLabel = client.company ?? client.name;
    const notif = await createNotif({
      type: isAdmin ? 'ACTION_AUTRE' : 'SITE_DEVIS',
      title: isAdmin ? 'Nouveau devis · Manuel' : 'Nouveau devis · Site web',
      message: isAdmin
        ? `${actorName} a créé un devis pour ${clientLabel} (${quote.ref ?? ''})`
        : `${clientLabel} — ${body.message?.slice(0, 60) ?? ''}`,
      quoteId: quote.id,
    });

    pushSSE('new_quote', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
    });
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
