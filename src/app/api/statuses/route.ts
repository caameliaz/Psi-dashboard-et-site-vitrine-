import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/statuses — liste tous les statuts personnalisés (admin + employé)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const statuses = await prisma.customStatus.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(statuses);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
  }
}

// POST /api/statuses — créer un statut personnalisé (admin uniquement)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.name || !body.color) {
      return NextResponse.json({ error: 'name et color sont requis' }, { status: 400 });
    }

    const last = await prisma.customStatus.findFirst({ orderBy: { order: 'desc' } });

    const status = await prisma.customStatus.create({
      data: {
        name: body.name,
        color: body.color,
        order: body.order ?? (last ? last.order + 1 : 0),
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
  }
}
