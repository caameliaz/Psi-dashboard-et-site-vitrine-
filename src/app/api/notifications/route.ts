import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications — notifs de l'utilisateur courant avec état lu/non lu
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const notifications = await prisma.notification.findMany({
      // Uniquement les notifs dont l'utilisateur courant est vraiment destinataire
      // (createNotif n'enregistre pas de `reads` pour l'acteur de sa propre action).
      where: { reads: { some: { userId: session.user.id } } },
      include: {
        reads: {
          where: { userId: session.user.id },
          select: { read: true, readAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Aplatir : ajouter `read` directement sur la notif
    const result = notifications.map((n) => ({
      ...n,
      read: n.reads[0]?.read ?? false,
      readAt: n.reads[0]?.readAt ?? null,
      reads: undefined,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}
