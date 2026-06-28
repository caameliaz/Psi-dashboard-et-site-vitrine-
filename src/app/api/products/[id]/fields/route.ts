import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/products/[id]/fields — ajouter une valeur de champ sur un produit (admin)
export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: productId } = await params;

  try {
    const body = await request.json();

    if (!body.definitionId || body.value === undefined) {
      return NextResponse.json({ error: 'definitionId et value sont requis' }, { status: 400 });
    }

    const field = await prisma.productCustomField.upsert({
      where: { productId_definitionId: { productId, definitionId: body.definitionId } },
      create: { productId, definitionId: body.definitionId, value: String(body.value) },
      update: { value: String(body.value) },
      include: { definition: true },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to set custom field' }, { status: 500 });
  }
}

// DELETE /api/products/[id]/fields?definitionId=xxx — supprimer un champ d'un produit (admin)
export async function DELETE(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: productId } = await params;
  const definitionId = request.nextUrl.searchParams.get('definitionId');

  if (!definitionId) {
    return NextResponse.json({ error: 'definitionId requis' }, { status: 400 });
  }

  try {
    await prisma.productCustomField.delete({
      where: { productId_definitionId: { productId, definitionId } },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete custom field' }, { status: 500 });
  }
}
