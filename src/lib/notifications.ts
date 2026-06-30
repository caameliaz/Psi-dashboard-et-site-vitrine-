import { prisma } from './prisma';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_PERSO' | 'ACTION_AUTRE' | 'ANNULATION';

/**
 * Crée une notification visible par tous les admins + employés actifs.
 */
export async function createNotif({
  type,
  title,
  message,
  orderId,
  quoteId,
}: {
  type: NotifType;
  title: string;
  message: string;
  orderId?: string;
  quoteId?: string;
}) {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true },
  });

  await prisma.notification.create({
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
}
