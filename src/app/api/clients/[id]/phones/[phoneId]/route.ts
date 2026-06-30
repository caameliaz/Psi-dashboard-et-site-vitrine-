import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string; phoneId: string }> };

// DELETE /api/clients/[id]/phones/[phoneId] — supprimer un numéro (admin + employé)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phoneId } = await params;

  try {
    await prisma.clientPhone.delete({ where: { id: phoneId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete phone' }, { status: 500 });
  }
}
