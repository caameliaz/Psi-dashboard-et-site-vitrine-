import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WHERE_HORS_ROLLINK } from '@/lib/order-filters';
import { hasPermission } from '@/lib/permissions';
import { ownRequestsWhere } from '@/lib/access';

// GET /api/orders/export — commandes LIVRE uniquement, pour rapport de ventes Excel
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!hasPermission(session.user as never, 'voir_commandes')) return NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 });

  try {
    // Un commercial n'exporte que SES commandes (mêmes règles de visibilité que la liste).
    const own = await ownRequestsWhere(session.user as never);
    const orders = await prisma.order.findMany({
      where: { ...WHERE_HORS_ROLLINK, status: 'LIVRE', ...(own ? { AND: [own] } : {}) },
      include: {
        client: { omit: { photo: true }, include: { phones: true } },
        items: {
          include: {
            product: { select: { reference: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      // Par date croissante : les plus anciennes livraisons en premier, puis date de commande
      orderBy: [{ deliveredAt: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
