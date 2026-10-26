import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireAnyPermission } from '@/lib/access';

// GET /api/stock/materials — vue stock des matières premières
export async function GET() {
  const guard = await requireAnyPermission(['voir_stock', 'voir_listes_stock', 'voir_stock_commercial', 'modifier_stock']);
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const materials = await prisma.rawMaterial.findMany({ orderBy: { reference: 'asc' } });
    return NextResponse.json(materials);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
