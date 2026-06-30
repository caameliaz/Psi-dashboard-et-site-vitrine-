import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/notifications/[id]/read — marquer une notif comme lue
export async function PATCH(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: notificationId } = await params;

  try {
    await prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId, userId: session.user.id } },
      create: { notificationId, userId: session.user.id, read: true, readAt: new Date() },
      update: { read: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
