import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string; noteId: string }> };

// DELETE /api/clients/[id]/notes/[noteId] — supprimer une note (admin + employé)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { noteId } = await params;

  try {
    await prisma.clientNote.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
