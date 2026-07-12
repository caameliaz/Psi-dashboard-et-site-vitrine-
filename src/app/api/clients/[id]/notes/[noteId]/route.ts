import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string; noteId: string }> };

// DELETE /api/clients/[id]/notes/[noteId] — supprimer une note (permission modifier_clients)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;

  const { noteId } = await params;

  try {
    await prisma.clientNote.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
