import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, hasPermission } from '@/lib/permissions';
import { createAudit, statusLabel } from '@/lib/audit';
import { createNotif } from '@/lib/notifications';
import { notifyStatusChange, notifyAssignment } from '@/lib/notify-activity';

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
        items: { include: { product: { include: { category: true } } } },
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

    // Modification des produits du devis (comme pour les commandes).
    // Un devis peut porter un prix unitaire par ligne (facultatif) → conservé
    // pour le détail, le PDF et l'Excel, en plus du total global (proposedPrice).
    if (body.items && Array.isArray(body.items)) {
      const current = await prisma.quote.findUnique({ where: { id }, select: { status: true } });
      if (current && (current.status === 'LIVRE' || current.status === 'ANNULE')) {
        return NextResponse.json({ error: 'Impossible de modifier un devis livré ou annulé' }, { status: 409 });
      }
      // Une référence LIBRE n'a pas de productId : son libellé est dans `description`.
      const validItems = (body.items as { productId?: string; description?: string; quantity?: number; metrage?: number; unitPrice?: number }[])
        .filter((it) => (it.productId || (it.description && it.description.trim() !== '')) && (it.quantity ?? 0) > 0);
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
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    const action = body.status !== undefined ? `Statut devis : ${statusLabel(body.status)}` : 'Devis modifié';
    const quoteLabel = quote.clientCompany || quote.clientName || quote.client?.name || '';
    createAudit({ userId: session.user.id, action, entity: 'DEVIS', entityId: id, detail: quoteLabel ? `${quote.ref} — ${quoteLabel}` : (quote.ref ?? id), quoteId: id });

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
