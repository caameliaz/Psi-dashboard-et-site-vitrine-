import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/clients/[id]/notes — ajouter une note interne (admin + employé)
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: clientId } = await params;

  try {
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 });
    }

    const note = await prisma.clientNote.create({
      data: {
        clientId,
        authorId: session.user.id,
        content: body.content,
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
