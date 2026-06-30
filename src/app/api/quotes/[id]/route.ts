import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/quotes/[id] — détail devis (admin + employé)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: { include: { category: true } } } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

// PATCH /api/quotes/[id] — modifier statut / champs admin / notes (admin + employé)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.proposedPrice !== undefined && { proposedPrice: Number(body.proposedPrice) }),
        ...(body.deliveryDelay !== undefined && { deliveryDelay: body.deliveryDelay }),
        ...(body.paymentTerms !== undefined && { paymentTerms: body.paymentTerms }),
        ...(body.adminRemarks !== undefined && { adminRemarks: body.adminRemarks }),
      },
      include: {
        client: { include: { phones: true } },
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(quote);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
