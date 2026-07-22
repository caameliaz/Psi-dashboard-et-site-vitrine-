import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { generateOrderRef } from '@/lib/generate-ref';
import { pushSSE } from '@/lib/sse-bus';
import { createAudit } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { validateEmail, validatePhone, validateText, validateQuantity, validatePositiveNumber, firstError } from '@/lib/validation';

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

    const rawItems: { productId?: string | null; description?: string; quantity?: number; unitPrice?: number; metrage?: number }[] =
      Array.isArray(body.items) ? body.items : [];

    // Validation serveur (le client peut contourner la validation du navigateur)
    const vErr = firstError([
      validateText(clientName, 'Nom du client', 2, true, 200),
      validatePhone(primaryPhone, true),
      validateEmail(body.client?.email ?? ''),
      validateText(clientCompany, 'Entreprise', 0, false, 200),
      rawItems.length > 50 ? 'Trop de lignes (max 50).' : null,
      ...rawItems.map((it, i) => {
        if (it.description != null && String(it.description).length > 300) return `Description ligne ${i + 1} trop longue (300 caractères max).`;
        // Le prix saisi côté client n'est utilisé QUE pour les lignes libres (sans productId) —
        // pour un produit du catalogue, le prix est de toute façon recalculé serveur ci-dessous.
        if (!it.productId && it.unitPrice != null) return validatePositiveNumber(it.unitPrice, `Prix ligne ${i + 1}`);
        return null;
      }),
    ]);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

    // 0. Identifiant explicite (commande créée DEPUIS une fiche client) :
    //    c'est la source la plus fiable, elle évite de créer un doublon quand
    //    le téléphone est saisi différemment (espaces, +213 vs 0…).
    let client = body.client?.id
      ? await prisma.client.findUnique({ where: { id: String(body.client.id) } })
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
    } else if (client.active === false) {
      // Le client était désactivé mais repasse commande → on le réactive
      // automatiquement (sinon il resterait invisible dans la liste).
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

    const ref = await generateOrderRef(client.wilaya);
    const validItems = rawItems.filter(
      (i) => ((i.productId && i.productId !== '') || (i.description && i.description.trim() !== '')) && (i.quantity ?? 0) > 0
    );

    if (validItems.length === 0) {
      return NextResponse.json({ error: 'Au moins un produit valide est requis' }, { status: 400 });
    }

    // Prix : jamais fait confiance au body pour un produit du catalogue — toujours
    // recalculé depuis la base pour empêcher une manipulation du prix côté client.
    const productIds = [...new Set(validItems.filter((i) => i.productId).map((i) => i.productId as string))];
    const dbProducts = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } })
      : [];
    const priceById = new Map(dbProducts.map((p) => [p.id, p.price]));

    const order = await prisma.order.create({
      data: {
        ref,
        clientId: client.id,
        // Snapshot de ce qui a été saisi POUR CETTE commande (pas la fiche client
        // potentiellement dédupliquée sur un autre nom via le téléphone/l'entreprise).
        clientName: clientName || client.name,
        clientCompany: clientCompany || client.company || null,
        clientWilaya: body.client?.wilaya || client.wilaya || null,
        clientCommune: body.client?.commune || client.commune || null,
        source: source as any,
        createdById: session?.user?.id ?? null,
        // Assignation : valeur fournie, sinon le créateur (utilisateur connecté)
        assignedToId: body.assignedToId ?? session?.user?.id ?? null,
        // Facturation / règlement (facultatifs)
        invoiceNumber: body.invoiceNumber ?? null,
        paymentMethod: body.paymentMethod ?? null,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        vatEnabled: Boolean(body.vatEnabled),
        items: {
          create: validItems.map((item) => ({
            productId: item.productId || null,
            description: item.productId ? null : (item.description ?? null),
            quantity: item.quantity as number,
            unitPrice: item.productId ? (priceById.get(item.productId) ?? 0) : Math.max(0, Number(item.unitPrice) || 0),
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
