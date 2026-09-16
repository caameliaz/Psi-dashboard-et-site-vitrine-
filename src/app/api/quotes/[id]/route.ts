import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { createAudit, statusLabel } from '@/lib/audit';
import { createNotif } from '@/lib/notifications';
import { notifyStatusChange, notifyAssignment } from '@/lib/notify-activity';
import {
  confirmStock, cancelStock, deliverStock, returnStock, releaseOrderItemStock, adjustOrderItemQuantity,
  forceCompleteOrder, previewForceCompleteShortfall, syncCommercialAssignmentForParent,
  previewFreeTextResolution, resolveFreeTextItems,
} from '@/lib/order-stock';

// Statuts où les lignes ne peuvent plus être modifiées (déjà sorties du stock/annulées)
const LOCKED_STATUSES = ['LIVRE', 'ANNULE', 'RETOURNE'];

type Ctx = { params: Promise<{ id: string }> };

// GET /api/quotes/[id] — détail devis (permission voir_commandes)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: { include: { phones: true } },
        items: {
          include: {
            product: { include: { category: true } },
            purchaseListItem: { select: { status: true } },
            productionListItem: { select: { status: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

// PATCH /api/quotes/[id] — modifier statut / champs admin / notes (permission modifier_statuts)
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

    // Ré-assigner le devis à un autre client → nécessite reassigner_client
    if (body.clientId !== undefined && !hasPermission(session.user as any, 'reassigner_client')) {
      return NextResponse.json({ error: "Vous n'avez pas la permission de ré-assigner le client" }, { status: 403 });
    }

    // Devis prioritaire — même règle que pour les commandes (cf. orders/[id]/route.ts). Ne
    // déclenche rien d'immédiat : compte juste comme "le plus ancien" au prochain calcul FIFO.
    if (body.priority !== undefined) {
      const statusNow = body.status !== undefined ? body.status : (await prisma.quote.findUnique({ where: { id }, select: { status: true } }))?.status;
      if (statusNow !== 'VALIDE') {
        return NextResponse.json({ error: 'La priorité ne peut être définie que sur un devis confirmé (Validé) et pas encore produit' }, { status: 400 });
      }
    }

    // Auto-attribution au commercial — même règle que pour les commandes (cf. orders/[id]/route.ts).
    if (body.autoAssignStock !== undefined) {
      const current = await prisma.quote.findUnique({ where: { id }, select: { status: true, assignedToId: true } });
      const statusNow = body.status !== undefined ? body.status : current?.status;
      if (statusNow !== 'EN_ATTENTE' && statusNow !== 'VALIDE') {
        return NextResponse.json({ error: "L'auto-attribution au commercial n'est modifiable qu'en attente ou confirmé" }, { status: 400 });
      }
      const assignedToIdNow = body.assignedToId !== undefined ? body.assignedToId : current?.assignedToId;
      if (body.autoAssignStock && !assignedToIdNow) {
        return NextResponse.json({ error: "Assigne d'abord un commercial (Pris en charge par) avant d'activer l'auto-attribution" }, { status: 400 });
      }
    }

    // "Marquer Produit" — vérifie AVANT de toucher à quoi que ce soit qu'il y a bien de quoi
    // couvrir tout le manquant (disponible → vol chez une commande déjà Produite ou Confirmée).
    // Jamais de fabrication ici — cf. orders/[id]/route.ts pour le détail du comportement.
    if (body.status === 'PRODUITE' && !body.force) {
      const { shortfalls } = await previewForceCompleteShortfall('quote', id);
      const freeText = await previewFreeTextResolution('quote', id);
      const allShortfalls = [...shortfalls, ...freeText.shortfalls.map((s) => ({ productId: null, reference: s.label, name: null, missing: s.missing }))];
      if (allShortfalls.length > 0) {
        return NextResponse.json({ error: 'PRODUCT_SHORTFALL', shortfall: allShortfalls }, { status: 409 });
      }
    }

    // Modification des produits du devis (comme pour les commandes).
    // Un devis peut porter un prix unitaire par ligne (facultatif) → conservé
    // pour le détail, le PDF et l'Excel, en plus du total global (proposedPrice).
    let current: { status: string } | null = null;
    if (body.items && Array.isArray(body.items)) {
      current = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
      if (current && LOCKED_STATUSES.includes(current.status)) {
        return NextResponse.json({ error: 'Impossible de modifier un devis livré, retourné ou annulé' }, { status: 409 });
      }
      // Une référence LIBRE n'a pas de productId : son libellé est dans `description`.
      const validItems = (body.items as { productId?: string; description?: string; quantity?: number; metrage?: number; unitPrice?: number }[])
        .filter((it) => (it.productId || (it.description && it.description.trim() !== '')) && (it.quantity ?? 0) > 0);

      const isConfirmed = current && (current.status === 'VALIDE' || current.status === 'PRODUITE');
      if (isConfirmed) {
        // Devis déjà confirmé : on ne rejoue le moteur de stock QUE pour ce qui change
        // réellement (cf. même correctif que pour les commandes, order-stock.ts) — sinon
        // une simple hausse/baisse de quantité peut fusionner avec la ligne de liste
        // d'une AUTRE commande/devis du même produit (une seule ligne partagée par produit).
        const existingItems = await prisma.quoteItem.findMany({ where: { quoteId: id } });
        const existingByProduct = new Map(existingItems.filter((e) => e.productId).map((e) => [e.productId as string, e]));
        const newProductIds = new Set(validItems.filter((it) => it.productId).map((it) => it.productId as string));

        for (const [productId, existing] of existingByProduct) {
          if (!newProductIds.has(productId)) await releaseOrderItemStock('quote', existing.id);
        }
        // Lignes "libres" (sans productId) : jamais réutilisées, toujours recréées entièrement —
        // mais si l'une d'elles avait déjà déclenché sa propre ligne de production (cf.
        // confirmStock), il faut la supprimer explicitement ici, sinon elle reste orpheline.
        const freeTextToRemove = existingItems.filter((e) => !e.productId && e.productionListItemId);
        if (freeTextToRemove.length > 0) {
          await prisma.productionListItem.deleteMany({ where: { id: { in: freeTextToRemove.map((e) => e.productionListItemId!) }, productId: null } });
        }
        await prisma.quoteItem.deleteMany({ where: { quoteId: id, productId: null } });
        await prisma.quoteItem.deleteMany({ where: { quoteId: id, productId: { notIn: Array.from(newProductIds) } } });

        for (const it of validItems) {
          if (it.productId) {
            const existing = existingByProduct.get(it.productId);
            if (existing) {
              if (existing.quantity !== it.quantity) await adjustOrderItemQuantity('quote', existing.id, it.quantity!);
              await prisma.quoteItem.update({
                where: { id: existing.id },
                data: {
                  metrage: it.metrage ?? existing.metrage,
                  unitPrice: it.unitPrice != null ? Number(it.unitPrice) : existing.unitPrice,
                },
              });
              continue;
            }
          }
          await prisma.quoteItem.create({
            data: {
              quoteId: id,
              productId: it.productId || null,
              description: it.productId ? null : (it.description ?? null),
              quantity: it.quantity!,
              metrage: it.metrage ?? null,
              unitPrice: it.unitPrice != null ? Number(it.unitPrice) : null,
            },
          });
        }
      } else {
        await prisma.quoteItem.deleteMany({ where: { quoteId: id } });
        if (validItems.length > 0) {
          await prisma.quoteItem.createMany({
            data: validItems.map((it) => ({
              quoteId: id,
              productId: it.productId || null,
              description: it.productId ? null : (it.description ?? null),
              quantity: it.quantity!,
              metrage: it.metrage ?? null,
              unitPrice: it.unitPrice != null ? Number(it.unitPrice) : null,
            })),
          });
        }
      }
    }

    // Mise à jour des prix unitaires depuis la modale de confirmation, par
    // désignation (référence produit ou description libre). N'altère pas les
    // lignes elles-mêmes → le lien produit (catégorie) reste intact pour le PDF.
    if (Array.isArray(body.itemPrices) && body.itemPrices.length > 0) {
      const existing = await prisma.quoteItem.findMany({
        where: { quoteId: id },
        include: { product: { select: { reference: true } } },
      });
      for (const ip of body.itemPrices as { designation?: string; unitPrice?: number }[]) {
        if (!ip?.designation) continue;
        const cible = ip.designation.split(' · ')[0].trim();
        const match = existing.find(
          (qi) => (qi.product?.reference ?? qi.description ?? '').trim() === cible,
        );
        if (match) {
          await prisma.quoteItem.update({
            where: { id: match.id },
            data: { unitPrice: ip.unitPrice != null ? Number(ip.unitPrice) : null },
          });
        }
      }
    }

    const quote = await prisma.quote.update({
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
        ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
        ...(body.clientId !== undefined && { clientId: body.clientId || null }),
        ...(body.proposedPrice !== undefined && { proposedPrice: Number(body.proposedPrice) }),
        ...(body.deliveryDelay !== undefined && { deliveryDelay: body.deliveryDelay }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms }),
        ...(body.adminRemarks !== undefined && { adminRemarks: body.adminRemarks }),
      },
      include: {
        client: { include: { phones: true } },
        items: {
          include: {
            product: true,
            purchaseListItem: { select: { status: true } },
            productionListItem: { select: { status: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const action = body.status !== undefined ? `Statut devis : ${statusLabel(body.status)}`
      : body.priority !== undefined ? (body.priority ? 'Devis marqué prioritaire' : 'Priorité retirée du devis')
      : body.autoAssignStock !== undefined ? (body.autoAssignStock ? 'Auto-attribution au commercial activée' : 'Auto-attribution au commercial désactivée')
      : 'Devis modifié';
    const quoteLabel = quote.clientCompany || quote.clientName || quote.client?.name || '';
    createAudit({ userId: session.user.id, action, entity: 'DEVIS', entityId: id, detail: quoteLabel ? `${quote.ref} — ${quoteLabel}` : (quote.ref ?? id), quoteId: id });

    // ── Répercussion sur le stock selon la transition de statut ────────────────
    try {
      if (body.autoAssignStock !== undefined) {
        await syncCommercialAssignmentForParent('quote', id);
      }

      if (body.status === 'VALIDE') {
        await confirmStock('quote', id);
      } else if (body.status === 'PRODUITE') {
        // "Marquer Produit" — résout la part manquante de chaque article (réallocation de stock
        // produit existant SEULEMENT, jamais de fabrication), la confirmation d'un éventuel
        // manquant a déjà eu lieu plus haut (cf. previewForceCompleteShortfall). `force: true`
        // accepte l'écart restant sans stock fictif — tracé dans l'audit si accepté.
        const phantom = await forceCompleteOrder('quote', id, { force: !!body.force });
        if (phantom.length > 0) {
          createAudit({
            userId: session.user.id, action: 'Marqué produit malgré un manquant (forcé)', entity: 'DEVIS', entityId: id,
            detail: phantom.map((p) => `${p.reference} — ${p.missing} manquant(s)`).join(', '), quoteId: id,
          });
        }
        await resolveFreeTextItems('quote', id, { force: !!body.force });
      } else if (body.status === 'ANNULE') {
        await cancelStock('quote', id);
      } else if (body.status === 'LIVRE') {
        await deliverStock('quote', id);
      } else if (body.status === 'RETOURNE') {
        await returnStock('quote', id);
      } else if (body.items !== undefined && (current?.status === 'VALIDE' || current?.status === 'PRODUITE')) {
        await confirmStock('quote', id);
        if (current.status === 'PRODUITE') {
          const items = await prisma.quoteItem.findMany({ where: { quoteId: id } });
          const allResolved = items.every((i) => i.stockPath === 'FROM_STOCK' || i.resolvedQuantity >= i.quantity);
          if (!allResolved) await prisma.quote.update({ where: { id }, data: { status: 'VALIDE' } });
        }
      }
    } catch (stockError) {
      console.error('[quotes] Erreur de mise à jour du stock :', stockError);
    }

    // Modification des PRODUITS (sans changement de statut) → notification aussi.
    if (body.items !== undefined && body.status === undefined) {
      createNotif({
        type: 'ACTION_AUTRE',
        title: 'Devis modifié',
        message: `${session.user.name ?? session.user.email ?? 'Un membre'} a modifié les produits du devis ${quote.ref ?? ''}${quoteLabel ? ` — ${quoteLabel}` : ''}`,
        actorId: session.user.id,
        quoteId: quote.id,
      }).catch(() => {});
    }

    if (body.status !== undefined) {
      notifyStatusChange({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        entityType: 'devis',
        clientLabel: quote.client?.company ?? quote.client?.name ?? '—',
        newStatus: body.status,
        quoteId: quote.id,
      }).catch(() => {});
    }

    if (body.assignedToId) {
      notifyAssignment({
        actorId: session.user.id!,
        actorName: session.user.name ?? session.user.email ?? 'Agent',
        assignedToId: body.assignedToId,
        entityType: 'devis',
        clientLabel: quote.client?.company ?? quote.client?.name ?? '—',
        ref: quote.ref ?? quote.id.slice(0, 8),
        quoteId: quote.id,
      }).catch(() => {});
    }

    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
