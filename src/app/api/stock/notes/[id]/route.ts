import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/stock/notes/[id] — supprime une note (comptes ADMIN uniquement, comme toute la fonctionnalité)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });

  const { id } = await params;
  try {
    const note = await prisma.stockNote.findUnique({ where: { id }, select: { refKey: true, content: true } });
    if (!note) return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
    await prisma.stockNote.delete({ where: { id } });
    createAudit({ userId: session.user.id, action: 'Note stock supprimée', entity: 'STOCK', entityId: note.refKey, detail: note.content.slice(0, 120) });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
