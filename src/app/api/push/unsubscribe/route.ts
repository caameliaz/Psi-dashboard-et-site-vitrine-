import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/push/unsubscribe — retire l'abonnement push de l'appareil courant
// Body : { endpoint }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { endpoint } = await request.json();
    if (!endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 });
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
