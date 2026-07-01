import { prisma } from './prisma';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_PERSO' | 'ACTION_AUTRE' | 'ANNULATION';

export async function createNotif({
  type,
  title,
  message,
  actorId,
  orderId,
  quoteId,
  adminOnly,
  actorOnly,
}: {
  type: NotifType;
  title: string;
  message: string;
  actorId?: string | null;
  orderId?: string;
  quoteId?: string;
  adminOnly?: boolean;
  actorOnly?: boolean;
}) {
  const users = actorOnly && actorId
    ? [{ id: actorId }]
    : await prisma.user.findMany({
        where: {
          active: true,
          ...(adminOnly && { role: 'ADMIN' }),
          ...(actorId && type !== 'SITE_COMMANDE' && type !== 'SITE_DEVIS'
            ? { NOT: { id: actorId } }
            : {}),
        },
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
