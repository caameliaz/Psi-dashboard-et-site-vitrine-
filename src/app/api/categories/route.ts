import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/categories — toutes les catégories (public)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories — créer une catégorie (admin)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const last = await prisma.category.findFirst({ orderBy: { order: 'desc' } });
    const order = last ? last.order + 1 : 0;

    const category = await prisma.category.create({
      data: {
        name: body.name,
        order: body.order ?? order,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
