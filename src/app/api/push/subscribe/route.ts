import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/push/subscribe — enregistre l'abonnement push de l'appareil courant
// Body : PushSubscription JSON ({ endpoint, keys: { p256dh, auth } })
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sub = await request.json();
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const authKey = sub?.keys?.auth;
    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 });
    }

    // upsert par endpoint (unique) → réabonnement / changement d'utilisateur géré
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: session.user.id, endpoint, p256dh, auth: authKey },
      update: { userId: session.user.id, p256dh, auth: authKey },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
