import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/statuses/[id] — modifier un statut (admin uniquement)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();

    const status = await prisma.customStatus.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });

    return NextResponse.json(status);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}

// DELETE /api/statuses/[id] — supprimer un statut (admin uniquement)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.customStatus.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}
