import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { createAudit, statusLabel } from '@/lib/audit';
import { createNotif } from '@/lib/notifications';
import { notifyStatusChange, notifyAssignment } from '@/lib/notify-activity';
import { confirmStock, cancelStock, deliverStock, returnStock, releaseOrderItemStock, adjustOrderItemQuantity, forceCompleteOrder, previewForceCompleteShortfall, syncCommercialAssignmentForParent } from '@/lib/order-stock';

// Statuts où les lignes ne peuvent plus être modifiées (déjà sorties du stock/annulées)
const LOCKED_STATUSES = ['LIVRE', 'ANNULE', 'RETOURNE'];

type Ctx = { params: Promise<{ id: string }> };

// GET /api/orders/[id] — détail commande (permission voir_commandes)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — modifier statut / notes / prix (permission modifier_statuts)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_statuts');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    // Changement d'assignation ("pris en charge par") → nécessite la permission assign_commandes
    if (body.assignedToId !== undefined && !hasPermission(session.user as any, 'assign_commandes')) {
      return NextResponse.json({ error: "Vous n'avez pas la permission d'assigner" }, { status: 403 });
    }

    // Ré-assigner la commande à un autre client → nécessite reassigner_client
    if (body.clientId !== undefined && !hasPermission(session.user as any, 'reassigner_client')) {
      return NextResponse.json({ error: "Vous n'avez pas la permission de ré-assigner le client" }, { status: 403 });
    }

    // Commande prioritaire — togglable seulement sur une commande confirmée (VALIDE) et pas
    // encore entièrement produite (PRODUITE = plus rien à prioriser dessus). Ne déclenche rien
    // d'immédiat : compte juste comme "la plus ancienne" au prochain calcul FIFO du stock
    // (distribution, réaffectation, reprise de couverture...).
    if (body.priority !== undefined) {
      const statusNow = body.status !== undefined ? body.status : (await prisma.order.findUnique({ where: { id }, select: { status: true } }))?.status;
      if (statusNow !== 'VALIDE') {
        return NextResponse.json({ error: 'La priorité ne peut être définie que sur une commande confirmée (Validée) et pas encore produite' }, { status: 400 });
      }
    }

    // Auto-attribution au commercial — togglable seulement en attente ou confirmée (EN_ATTENTE
    // / VALIDE), et seulement si un commercial ("Pris en charge par") est assigné, sinon rien à
    // créditer (cf. syncCommercialAssignment, order-stock.ts).
    if (body.autoAssignStock !== undefined) {
      const current = await prisma.order.findUnique({ where: { id }, select: { status: true, assignedToId: true } });
      const statusNow = body.status !== undefined ? body.status : current?.status;
      if (statusNow !== 'EN_ATTENTE' && statusNow !== 'VALIDE') {
        return NextResponse.json({ error: "L'auto-attribution au commercial n'est modifiable qu'en attente ou confirmée" }, { status: 400 });
      }
      const assignedToIdNow = body.assignedToId !== undefined ? body.assignedToId : current?.assignedToId;
      if (body.autoAssignStock && !assignedToIdNow) {
        return NextResponse.json({ error: "Assigne d'abord un commercial (Pris en charge par) avant d'activer l'auto-attribution" }, { status: 400 });
      }
    }

    // "Marquer Produit" — vérifie AVANT de toucher à quoi que ce soit qu'il y a bien de quoi
    // couvrir tout le manquant (disponible → vol chez une commande déjà Produite → fabrication
    // avec la matière réservée). Blocage (409) si non, SAUF si l'utilisateur a explicitement
    // choisi de continuer quand même (`body.force`) — dans ce cas le manquant restant est
    // marqué résolu SANS qu'aucun stock fictif ne soit inventé (cf. forceCompleteOrder), un
    // écart assumé plutôt qu'un blocage total ou un mensonge silencieux sur le stock.
    if (body.status === 'PRODUITE' && !body.force) {
      const shortfall = await previewForceCompleteShortfall('order', id);
      if (shortfall.length > 0) {
        return NextResponse.json({ error: 'PRODUCT_SHORTFALL', shortfall }, { status: 409 });
      }
    }

    // Mise à jour des prix unitaires par produit si fournis
    if (body.itemPrices && Array.isArray(body.itemPrices)) {
      const existing = await prisma.orderItem.findMany({ where: { orderId: id }, include: { product: true } });
      await Promise.all(body.itemPrices.map(async (ip: { designation: string; unitPrice: number }) => {
        const match = existing.find(e => e.product?.reference === ip.designation);
        if (match) await prisma.orderItem.update({ where: { id: match.id }, data: { unitPrice: ip.unitPrice } });
      }));
    }

    // Remplacement complet des lignes de la commande (bouton "Modifier")
    // body.items = [{ productId | description, quantity, unitPrice, metrage }] — pas de modif si livrée/annulée/retournée
    let current: { status: string } | null = null;
    if (body.items && Array.isArray(body.items)) {
      current = await prisma.order.findUnique({ where: { id }, select: { status: true } });
      if (current && LOCKED_STATUSES.includes(current.status)) {
        return NextResponse.json({ error: 'Impossible de modifier une commande livrée, retournée ou annulée' }, { status: 409 });
      }
      // Une référence LIBRE n'a pas de productId : son libellé est dans `description`.
      // (avant, ces lignes étaient filtrées → elles disparaissaient à chaque modification)
      const validItems = (body.items as { productId?: string; description?: string; quantity?: number; unitPrice?: number; metrage?: number }[])
        .filter((it) => (it.productId || (it.description && it.description.trim() !== '')) && (it.quantity ?? 0) > 0);

      const isConfirmed = current && (current.status === 'VALIDE' || current.status === 'PRODUITE');
      if (isConfirmed) {
        // Commande déjà confirmée : on ne rejoue le moteur de stock QUE pour ce qui
        // change réellement, au lieu de tout relâcher puis tout reconfirmer — sinon
        // une simple hausse/baisse de quantité peut se retrouver fusionnée avec une
        // ligne de liste appartenant à une AUTRE commande du même produit (une seule
        // ligne partagée par produit, cf. findOrCreate*ItemForProduct).
        const existingItems = await prisma.orderItem.findMany({ where: { orderId: id } });
        const existingByProduct = new Map(existingItems.filter((e) => e.productId).map((e) => [e.productId as string, e]));
        const newProductIds = new Set(validItems.filter((it) => it.productId).map((it) => it.productId as string));

        // Produits retirés de la commande → on relâche entièrement leur effet stock.
        for (const [productId, existing] of existingByProduct) {
          if (!newProductIds.has(productId)) await releaseOrderItemStock('order', existing.id);
        }
        // Lignes "libres" (sans productId) : pas de suivi de stock → on les remplace telles quelles.
        await prisma.orderItem.deleteMany({ where: { orderId: id, productId: null } });
        await prisma.orderItem.deleteMany({ where: { orderId: id, productId: { notIn: Array.from(newProductIds) } } });

        for (const it of validItems) {
          if (it.productId) {
            const existing = existingByProduct.get(it.productId);
            if (existing) {
              // Même produit déjà engagé → ajuste par delta (préserve la ligne de liste liée).
              if (existing.quantity !== it.quantity) await adjustOrderItemQuantity('order', existing.id, it.quantity!);
              await prisma.orderItem.update({
                where: { id: existing.id },
                data: { unitPrice: it.unitPrice ?? existing.unitPrice, metrage: it.metrage ?? existing.metrage },
              });
              continue;
            }
          }
          // Nouvelle ligne (produit pas encore présent, ou référence libre) → confirmStock la traitera.
          await prisma.orderItem.create({
            data: {
              orderId: id,
              productId: it.productId || null,
              description: it.productId ? null : (it.description ?? null),
              quantity: it.quantity!,
              unitPrice: it.unitPrice ?? 0,
              metrage: it.metrage ?? null,
            },
          });
        }
      } else {
        await prisma.orderItem.deleteMany({ where: { orderId: id } });
        if (validItems.length > 0) {
          await prisma.orderItem.createMany({
            data: validItems.map((it) => ({
              orderId: id,
              productId: it.productId || null,
              description: it.productId ? null : (it.description ?? null),
              quantity: it.quantity!,
              unitPrice: it.unitPrice ?? 0,
              metrage: it.metrage ?? null,
            })),
          });
        }
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.priority !== undefined && { priority: Boolean(body.priority) }),
        ...(body.autoAssignStock !== undefined && { autoAssignStock: Boolean(body.autoAssignStock) }),
        // Facturation / règlement — modifiables après validation
        ...(body.invoiceNumber !== undefined && { invoiceNumber: body.invoiceNumber || null }),
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod || null }),
        ...(body.paymentDate !== undefined && { paymentDate: body.paymentDate ? new Date(body.paymentDate) : null }),
        ...(body.vatEnabled !== undefined && { vatEnabled: Boolean(body.vatEnabled) }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
        ...(body.clientId !== undefined && { clientId: body.clientId || null }),
        ...(body.totalOverride !== undefined && { notes: `TOTAL:${body.totalOverride}${body.notes ? '\n' + body.notes : ''}` }),
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const action = body.status !== undefined ? `Statut commande : ${statusLabel(body.status)}`
      : body.priority !== undefined ? (body.priority ? 'Commande marquée prioritaire' : 'Priorité retirée de la commande')
      : body.autoAssignStock !== undefined ? (body.autoAssignStock ? 'Auto-attribution au commercial activée' : 'Auto-attribution au commercial désactivée')
      : 'Commande modifiée';
    const orderLabel = order.clientCompany || order.clientName || order.client?.name || '';
    createAudit({ userId: session.user.id, action, entity: 'COMMANDE', entityId: id, detail: orderLabel ? `${order.ref} — ${orderLabel}` : order.ref, orderId: id });

    // ── Répercussion sur le stock selon la transition de statut ────────────────
    try {
      // `autoAssignStock` vient de changer (case cochée/décochée) → le resolvedQuantity des
      // articles ne bouge pas, mais la CIBLE de l'auto-attribution change instantanément :
      // on retire tout de suite le stock déjà crédité si on décoche (cf. syncCommercialAssignment).
      if (body.autoAssignStock !== undefined) {
        await syncCommercialAssignmentForParent('order', id);
      }

      if (body.status === 'VALIDE') {
        await confirmStock('order', id);
      } else if (body.status === 'PRODUITE') {
        // "Marquer Produit" — résout la part manquante de chaque article (matière première
        // + liste d'achat/production), la confirmation d'un éventuel manquant a déjà eu lieu
        // plus haut (cf. previewForceCompleteShortfall). `force: true` accepte l'écart restant
        // sans stock fictif — tracé dans l'audit si un manquant a réellement été accepté.
        const phantom = await forceCompleteOrder('order', id, { force: !!body.force });
        if (phantom.length > 0) {
          createAudit({
            userId: session.user.id, action: 'Marqué produit malgré un manquant (forcé)', entity: 'COMMANDE', entityId: id,
            detail: phantom.map((p) => `${p.reference} — ${p.missing} manquant(s)`).join(', '), orderId: id,
          });
        }
      } else if (body.status === 'ANNULE') {
        await cancelStock('order', id);
      } else if (body.status === 'LIVRE') {
        await deliverStock('order', id);
      } else if (body.status === 'RETOURNE') {
        await returnStock('order', id);
      } else if (body.items !== undefined && (current?.status === 'VALIDE' || current?.status === 'PRODUITE')) {
        // Lignes modifiées sans changement de statut, commande déjà confirmée
        // → traite les nouvelles lignes (stockPath NONE) comme une confirmation.
        await confirmStock('order', id);
        if (current.status === 'PRODUITE') {
          // La commande était PRODUITE (tout résolu) avant la modif : si l'ajout/la
          // hausse de quantité a fait réapparaître un article non résolu, elle doit
          // repasser VALIDE (confirmStock ne fait jamais redescendre le statut seul).
          const items = await prisma.orderItem.findMany({ where: { orderId: id } });
          const allResolved = items.every((i) => i.stockPath === 'FROM_STOCK' || i.resolvedQuantity >= i.quantity);
          if (!allResolved) await prisma.order.update({ where: { id }, data: { status: 'VALIDE' } });
        }
      }
    } catch (stockError) {
      console.error('[orders] Erreur de mise à jour du stock :', stockError);
    }

    // Modification des PRODUITS (sans changement de statut) → on prévient quand même :
    // admins + employé assigné, comme pour les autres actions sur la commande.
    if (body.items !== undefined && body.status === undefined) {
      createNotif({
        type: 'ACTION_AUTRE',
        title: 'Commande modifiée',
        message: `${session.user.name ?? session.user.email ?? 'Un membre'} a modifié les produits de la commande ${order.ref}${orderLabel ? ` — ${orderLabel}` : ''}`,
        actorId: session.user.id,
        orderId: order.id,
      }).catch(() => {});
    }

    if (body.status !== undefined) {
      notifyStatusChange({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        entityType: 'commande',
        clientLabel: order.client?.company ?? order.client?.name ?? '—',
        newStatus: body.status,
        orderId: order.id,
      }).catch(() => {});
    }

    if (body.assignedToId) {
      notifyAssignment({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        assignedToId: body.assignedToId,
        entityType: 'commande',
        clientLabel: order.client?.company ?? order.client?.name ?? '—',
        ref: order.ref ?? order.id.slice(0, 8),
        orderId: order.id,
      }).catch(() => {});
    }

    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
