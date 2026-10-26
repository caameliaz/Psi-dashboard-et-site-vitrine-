import { NextRequest, NextResponse } from 'next/server';
import { guardClientAccess } from '@/lib/access';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string; phoneId: string }> };

// DELETE /api/clients/[id]/phones/[phoneId] — supprimer un numéro (permission modifier_clients)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id: clientId, phoneId } = await params;
  const guard = await guardClientAccess('modifier_clients', clientId);
  if (guard.error) return guard.error;

  try {
    // deleteMany avec clientId : on ne supprime que si le numéro appartient bien à CE client
    await prisma.clientPhone.deleteMany({ where: { id: phoneId, clientId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete phone' }, { status: 500 });
  }
}
