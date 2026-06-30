import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/templates — liste tous les templates (admin + employé)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: [{ category: 'asc' }, { order: 'asc' }],
    });
    return NextResponse.json(templates);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/templates — créer un template (admin uniquement)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.title || !body.content) {
      return NextResponse.json({ error: 'title et content sont requis' }, { status: 400 });
    }

    const last = await prisma.messageTemplate.findFirst({ orderBy: { order: 'desc' } });

    const template = await prisma.messageTemplate.create({
      data: {
        title: body.title,
        content: body.content,
        category: body.category ?? 'AUTRE',
        order: body.order ?? (last ? last.order + 1 : 0),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
