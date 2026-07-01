import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/orders/export — commandes LIVRE uniquement, pour rapport de ventes Excel
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const orders = await prisma.order.findMany({
      where: { status: 'LIVRE' },
      include: {
        client: { include: { phones: true } },
        items: {
          include: {
            product: { select: { reference: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
