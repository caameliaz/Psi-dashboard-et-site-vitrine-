import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;

  const { id } = await params;
  try {
    await prisma.customRole.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
