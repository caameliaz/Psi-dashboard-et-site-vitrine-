import { prisma } from './prisma';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_PERSO' | 'ACTION_AUTRE' | 'ANNULATION';

export async function createNotif({
  type,
  title,
  message,
  actorId,
  orderId,
  quoteId,
  assignedToId,
  adminOnly,
  actorOnly,
}: {
  type: NotifType;
  title: string;
  message: string;
  actorId?: string | null;
  orderId?: string;
  quoteId?: string;
  assignedToId?: string | null;
  adminOnly?: boolean;
  actorOnly?: boolean;
}) {
  let users: { id: string }[];

  if (actorOnly && actorId) {
    // Uniquement l'acteur (ex: confirmation d'une action personnelle)
    users = [{ id: actorId }];
  } else {
    // Résoudre l'assigné depuis la commande/devis si non fourni
    let resolvedAssignedTo = assignedToId ?? null;
    if (!resolvedAssignedTo && orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { assignedToId: true },
      });
      resolvedAssignedTo = order?.assignedToId ?? null;
    }
    if (!resolvedAssignedTo && quoteId) {
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        select: { assignedToId: true },
      });
      resolvedAssignedTo = quote?.assignedToId ?? null;
    }

    // Employés concernés : acteur + assigné (les autres ne reçoivent pas)
    const relevantEmployeeIds = [
      ...(actorId ? [actorId] : []),
      ...(resolvedAssignedTo ? [resolvedAssignedTo] : []),
    ];

    users = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          // Tous les admins reçoivent toutes les notifs
          { role: 'ADMIN' },
          // Les employés : seulement s'ils sont l'acteur ou l'assigné
          ...(relevantEmployeeIds.length > 0 && !adminOnly
            ? [{ role: { not: 'ADMIN' as const }, id: { in: relevantEmployeeIds } }]
            : []),
        ],
      },
      select: { id: true },
    });
  }

  // Déduplication (un admin peut aussi être l'acteur)
  const uniqueIds = [...new Map(users.map((u) => [u.id, u])).values()];

  const notif = await prisma.notification.create({
    data: {
      type,
      title,
      message,
      orderId: orderId ?? null,
      quoteId: quoteId ?? null,
      reads: {
        create: uniqueIds.map((u) => ({ userId: u.id, read: false })),
      },
    },
  });

  return { notif, userIds: uniqueIds.map((u) => u.id) };
}
