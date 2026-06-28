import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/products/fields — tous les champs personnalisés définis (admin)
export async function GET() {
  // TODO: remettre auth avant prod
  // const session = await auth();
  // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const fields = await prisma.productFieldDef.findMany({
      orderBy: { label: 'asc' },
    });
    return NextResponse.json(fields);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch field definitions' }, { status: 500 });
  }
}

// POST /api/products/fields — créer une définition de champ (admin)
export async function POST(request: NextRequest) {
  // TODO: remettre auth avant prod
  // const session = await auth();
  // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    if (!body.label || !body.type) {
      return NextResponse.json({ error: 'label et type sont requis' }, { status: 400 });
    }

    const field = await prisma.productFieldDef.create({
      data: {
        label: body.label,
        type: body.type,
        required: body.required ?? false,
        order: body.order ?? 0,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create field definition' }, { status: 500 });
  }
}
