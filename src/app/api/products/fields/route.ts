import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET /api/products/fields — tous les champs personnalisés définis (permission modifier_produits)
export async function GET() {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;

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
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;

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
