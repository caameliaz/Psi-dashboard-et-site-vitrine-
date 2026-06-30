import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/notifications/read — marquer toutes les notifs comme lues
export async function PATCH() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id;
    const now = new Date();

    const allNotifs = await prisma.notification.findMany({ select: { id: true } });
    const notifIds = allNotifs.map((n) => n.id);

    // Mettre à jour les entrées existantes en une seule requête
    await prisma.notificationRead.updateMany({
      where: { userId, notificationId: { in: notifIds } },
      data: { read: true, readAt: now },
    });

    // Créer les entrées manquantes (celles qui n'ont pas encore de NotificationRead)
    const existing = await prisma.notificationRead.findMany({
      where: { userId },
      select: { notificationId: true },
    });
    const existingIds = new Set(existing.map((e) => e.notificationId));
    const toCreate = notifIds.filter((id) => !existingIds.has(id));

    if (toCreate.length > 0) {
      await prisma.notificationRead.createMany({
        data: toCreate.map((notificationId) => ({ notificationId, userId, read: true, readAt: now })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to mark all as read' }, { status: 500 });
  }
}
