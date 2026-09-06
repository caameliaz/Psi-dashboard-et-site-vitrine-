import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// GET /api/raw-materials — liste des matières premières (admin)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const materials = await prisma.rawMaterial.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(materials);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch raw materials' }, { status: 500 });
  }
}

// POST /api/raw-materials — créer une matière première (permission modifier_stock)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();

    if (!body.reference || !body.name || !body.unit || body.price == null) {
      return NextResponse.json({ error: 'Référence, nom, unité et prix requis' }, { status: 400 });
    }

    const stockMax = body.stockMax != null ? Number(body.stockMax) : 140;

    const material = await prisma.rawMaterial.create({
      data: {
        reference: body.reference,
        name: body.name,
        unit: body.unit,
        price: Number(body.price),
        stockMax,
        purchaseThreshold: body.purchaseThreshold != null ? Number(body.purchaseThreshold) : Math.round(stockMax * 0.5),
        available: body.available != null ? Number(body.available) : 0,
      },
    });

    createAudit({ userId: session?.user?.id, action: 'Matière première créée', entity: 'MATIERE', entityId: material.id, detail: `${material.name} (${material.reference})` });
    return NextResponse.json(material, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Cette référence existe déjà' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create raw material' }, { status: 500 });
  }
}
