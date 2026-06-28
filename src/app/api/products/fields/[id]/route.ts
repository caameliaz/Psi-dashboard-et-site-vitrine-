import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/products/fields/[id] — supprimer une définition de champ (admin)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
