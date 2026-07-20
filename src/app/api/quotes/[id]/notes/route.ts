import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/quotes/[id]/notes — fil des notes d'un devis (permission voir_commandes)
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;
  const { id: quoteId } = await params;
  try {
    const notes = await prisma.requestNote.findMany({
      where: { quoteId },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(notes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST /api/quotes/[id]/notes — ajouter une note (permission modifier_statuts)
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_statuts');
  if (guard.error) return guard.error;
  const session = guard.session;
  const { id: quoteId } = await params;
  try {
    const body = await request.json();
    const content = (body?.content ?? '').trim();
    if (!content) return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });

    const note = await prisma.requestNote.create({
      data: { quoteId, authorId: session.user.id, content },
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
