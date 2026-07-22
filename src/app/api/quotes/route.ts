import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { generateQuoteRef } from '@/lib/generate-ref';
import { pushSSE } from '@/lib/sse-bus';
import { createAudit } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { validateEmail, validatePhone, validateText, validateQuantity, firstError } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  // ?from=<ISO> → ne renvoie que les devis créés depuis cette date (perf : filtre par période)
  const fromParam = request.nextUrl.searchParams.get('from');
  const from = fromParam ? new Date(fromParam) : null;

  try {
    const quotes = await prisma.quote.findMany({
      where: from && !isNaN(from.getTime()) ? { createdAt: { gte: from } } : undefined,
      include: {
        client: { include: { phones: true } },
        items: { include: { product: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
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
  const limited = rateLimit(request, 'quotes', 10, 60_000); // 10 devis / min / IP
  if (limited) return limited;
  try {
    const body = await request.json();
    const session = await auth();

    const primaryPhone: string = body.phone ?? '';
    const clientName: string = body.name ?? '';
    const clientCompany: string = body.company ?? '';

    interface QuoteItemInput {
      productId?: string; description?: string; width?: number; length?: number; metrage?: number; quantity: number;
    }
    const items: QuoteItemInput[] = Array.isArray(body.items) ? body.items : [];

    // Validation serveur (le client peut contourner la validation du navigateur)
    const vErr = firstError([
      validateText(clientName, 'Nom du client', 2, true, 200),
      validatePhone(primaryPhone, true),
      validateEmail(body.email ?? ''),
      validateText(clientCompany, 'Entreprise', 0, false, 200),
      validateText(String(body.message ?? ''), 'Message', 0, false, 3000),
      items.length > 50 ? 'Trop de lignes (max 50).' : null,
      ...items.map((item, i) =>
        item?.description != null && String(item.description).length > 300
          ? `Description ligne ${i + 1} trop longue (300 caractères max).`
          : item?.quantity != null ? validateQuantity(item.quantity) : null
      ),
    ]);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // 0. Identifiant explicite (devis créé DEPUIS une fiche client) — évite les doublons.
    let client = body.clientId
      ? await prisma.client.findUnique({ where: { id: String(body.clientId) } })
      : null;

    // 1. Sinon cherche par téléphone
    if (!client) client = primaryPhone
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
          commune: body.commune ?? null,
          phones: {
            create: primaryPhone
              ? [{ number: primaryPhone, label: 'Principal', primary: true }]
              : [],
          },
        },
      });
    } else if (client.active === false) {
      // Le client était désactivé mais refait une demande → réactivation auto
      client = await prisma.client.update({
        where: { id: client.id },
        data: { active: true, deactivatedReason: null, deactivatedById: null, deactivatedAt: null },
      });
      createNotif({
        type: 'ACTION_AUTRE',
        title: 'Client réactivé',
        message: `${client.company ?? client.name} était désactivé et vient de passer une nouvelle demande — le compte a été réactivé automatiquement.`,
        adminOnly: true,
        clientId: client.id,
      }).catch(() => {});
    }

    const VALID_SOURCES = ['SITE', 'ADMIN', 'WHATSAPP', 'TELEPHONE', 'AUTRE'];
    const source = VALID_SOURCES.includes(body.source) ? body.source : 'SITE';

    const ref = await generateQuoteRef(client.wilaya);
    const quote = await prisma.quote.create({
      data: {
        ref,
        clientId: client.id,
        // Snapshot de ce qui a été saisi POUR CE devis (pas la fiche client
        // potentiellement dédupliquée sur un autre nom via le téléphone/l'entreprise).
        clientName: clientName || client.name,
        clientCompany: clientCompany || client.company || null,
        clientWilaya: body.wilaya || client.wilaya || null,
        message: body.message ?? '',
        source: source as any,
        createdById: session?.user?.id ?? null,
        // Assignation : valeur fournie, sinon le créateur (utilisateur connecté)
        assignedToId: body.assignedToId ?? session?.user?.id ?? null,
        items: {
          create: items.map((item: {
            productId?: string;
            description?: string;
            width?: number;
            length?: number;
            metrage?: number;
            quantity: number;
          }) => ({
            productId: item.productId ?? null,
            description: item.description ?? null,
            width: item.width ?? null,
            length: item.length ?? null,
            metrage: item.metrage ?? null,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true, client: { include: { phones: true } } },
    });

    const isAdmin = body.source !== 'SITE';
    const actorName = session?.user?.name ?? session?.user?.email ?? 'Agent';
    const clientLabel = client.company ?? client.name;
    // Devis du SITE = client externe → actorId null pour que TOUT LE MONDE reçoive la notif
    // (même si un admin est connecté dans un autre onglet du même navigateur).
    const { notif, userIds } = await createNotif({
      type: isAdmin ? 'ACTION_AUTRE' : 'SITE_DEVIS',
      title: isAdmin ? 'Nouveau devis · Manuel' : 'Nouveau devis · Site web',
      message: isAdmin
        ? `${actorName} a créé un devis pour ${clientLabel} (${quote.ref ?? ''})`
        : `${clientLabel} a lancé un devis (${quote.ref ?? ''})`,
      actorId: isAdmin ? (session?.user?.id ?? null) : null,
      quoteId: quote.id,
      selfToastMessage: isAdmin ? 'Vous avez créé un devis' : undefined,
    });

    pushSSE('new_quote', {
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt.toISOString(),
    }, userIds);
    createAudit({
      userId: session?.user?.id,
      action: 'Devis créé',
      entity: 'DEVIS',
      entityId: quote.id,
      detail: `${client.company ?? client.name}`,
      quoteId: quote.id,
    });
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}
