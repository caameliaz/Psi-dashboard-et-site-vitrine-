import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/products/fields/[id] — modifier une définition de champ (admin)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await request.json();

    const field = await prisma.productFieldDef.update({
      where: { id },
      data: {
        ...(body.label !== undefined && { label: body.label }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.required !== undefined && { required: body.required }),
        ...(body.order !== undefined && { order: body.order }),
      },
    });

    return NextResponse.json(field);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update field definition' }, { status: 500 });
  }
}

// DELETE /api/products/fields/[id] — supprimer une définition de champ (admin)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    // Les ProductCustomField liés sont supprimés en cascade (onDelete: Cascade dans le schema)
    await prisma.productFieldDef.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete field definition' }, { status: 500 });
  }
}
