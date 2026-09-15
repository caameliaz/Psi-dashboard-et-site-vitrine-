import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/stock/materials — vue stock des matières premières
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const materials = await prisma.rawMaterial.findMany({ orderBy: { reference: 'asc' } });
    return NextResponse.json(materials);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}
