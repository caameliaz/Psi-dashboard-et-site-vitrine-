import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRollLinkApiKey } from '@/lib/rolllink-auth';

// GET /api/rolllink/achat — lignes de la liste d'achat (produits "Acheté") liées à des
// commandes ROLLINK uniquement (jamais celles des commandes internes normales de PSI Dash,
// ni les lignes d'achat de matière première pure — pas de lien direct à un OrderItem).
export async function GET(request: NextRequest) {
  const authError = checkRollLinkApiKey(request);
  if (authError) return authError;

  const lines = await prisma.purchaseListItem.findMany({
    where: { orderItems: { some: { order: { source: 'ROLLINK' } } } },
    include: {
      product: { select: { id: true, reference: true, name: true } },
      orderItems: {
        where: { order: { source: 'ROLLINK' } },
        select: { order: { select: { ref: true } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    lignes: lines.map((l) => ({
      productId: l.productId,
      produit: l.product ? { reference: l.product.reference, nom: l.product.name } : null,
      quantite: l.neededQuantity,
      statut: l.status,
      commandes: l.orderItems.map((i) => i.order.ref).filter(Boolean),
    })),
  });
}
