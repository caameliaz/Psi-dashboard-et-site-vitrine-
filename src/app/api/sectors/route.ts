import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET /api/sectors — liste des secteurs d'activité (accessible avec voir_clients)
export async function GET() {
  const guard = await requirePermission('voir_clients');
  if (guard.error) return guard.error;
  try {
    const sectors = await prisma.sector.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { clients: true } } },
    });
    return NextResponse.json(sectors);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch sectors' }, { status: 500 });
  }
}

// POST /api/sectors — créer un secteur (permission modifier_clients)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  try {
    const body = await request.json();
    const name = (body?.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });

    const existing = await prisma.sector.findUnique({ where: { name } });
    if (existing) return NextResponse.json({ error: 'Ce secteur existe déjà' }, { status: 409 });

    const sector = await prisma.sector.create({ data: { name } });
    return NextResponse.json(sector, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create sector' }, { status: 500 });
  }
}
