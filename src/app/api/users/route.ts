import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/users — liste de tous les users (id + name) pour les dropdowns
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error('❌ Erreur chargement users:', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
