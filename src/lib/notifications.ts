import { prisma } from './prisma';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_PERSO' | 'ACTION_AUTRE' | 'ANNULATION';

export async function createNotif({
  type,
  title,
  message,
  actorId,
  orderId,
  quoteId,
}: {
  type: NotifType;
  title: string;
  message: string;
  actorId?: string | null;
  orderId?: string;
  quoteId?: string;
}) {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });

  const notif = await prisma.notification.create({
    data: {
      type,
      title,
      message,
      orderId: orderId ?? null,
      quoteId: quoteId ?? null,
      reads: {
        create: users.map((u) => ({ userId: u.id, read: false })),
      },
    },
  });

  return notif;
}
