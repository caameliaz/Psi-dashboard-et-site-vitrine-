import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/users/disconnect-all — invalider tous les cookies de l'utilisateur courant
// Incrémente sessionVersion → toutes les sessions existantes deviennent invalides
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { sessionVersion: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to disconnect sessions' }, { status: 500 });
  }
}
