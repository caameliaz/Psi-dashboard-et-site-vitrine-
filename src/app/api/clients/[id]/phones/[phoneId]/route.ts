import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string; phoneId: string }> };

// DELETE /api/clients/[id]/phones/[phoneId] — supprimer un numéro (permission modifier_clients)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;

  const { phoneId } = await params;

  try {
    await prisma.clientPhone.delete({ where: { id: phoneId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete phone' }, { status: 500 });
  }
}
