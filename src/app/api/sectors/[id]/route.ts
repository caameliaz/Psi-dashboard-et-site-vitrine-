import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/sectors/[id] — renommer un secteur (permission modifier_clients)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    const body = await request.json();
    const name = (body?.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    const sector = await prisma.sector.update({ where: { id }, data: { name } });
    return NextResponse.json(sector);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update sector' }, { status: 500 });
  }
}

// DELETE /api/sectors/[id] — supprimer un secteur (permission modifier_clients)
// Les clients rattachés voient juste leur secteur passer à null (pas de suppression).
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    await prisma.client.updateMany({ where: { sectorId: id }, data: { sectorId: null } });
    await prisma.sector.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete sector' }, { status: 500 });
  }
}
