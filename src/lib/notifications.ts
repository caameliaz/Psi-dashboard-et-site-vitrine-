import { prisma } from './prisma';
import { pushSSE } from './sse-bus';
import { sendPushToUsers } from './push';

type NotifType = 'SITE_COMMANDE' | 'SITE_DEVIS' | 'ACTION_PERSO' | 'ACTION_AUTRE' | 'ANNULATION';

export async function createNotif({
  type,
  title,
  message,
  actorId,
  orderId,
  quoteId,
  clientId,
  link,
  assignedToId,
  adminOnly,
  actorOnly,
  selfToastMessage,
}: {
  type: NotifType;
  title: string;
  message: string;
  actorId?: string | null;
  orderId?: string;
  quoteId?: string;
  clientId?: string;
  link?: string;
  assignedToId?: string | null;
  adminOnly?: boolean;
  actorOnly?: boolean;
  // Message court affiché en toast à l'acteur lui-même (ex: "Vous avez créé un devis").
  // L'acteur ne reçoit jamais la notif détaillée persistée (donc jamais dans sa sidebar) —
  // seulement ce toast transitoire, non lié à un enregistrement Notification.
  selfToastMessage?: string;
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
  let uniqueIds = [...new Map(users.map((u) => [u.id, u])).values()];

  // L'acteur ne doit jamais voir sa propre action dans sa sidebar de notifs —
  // on l'exclut des destinataires persistés (sauf si la notif est explicitement
  // réservée à lui seul via actorOnly).
  if (!actorOnly && actorId) {
    uniqueIds = uniqueIds.filter((u) => u.id !== actorId);
  }

  const notif = await prisma.notification.create({
    data: {
      type,
      title,
      message,
      orderId: orderId ?? null,
      quoteId: quoteId ?? null,
      clientId: clientId ?? null,
      link: link ?? null,
      reads: {
        create: uniqueIds.map((u) => ({ userId: u.id, read: false })),
      },
    },
  });

  if (actorId && selfToastMessage) {
    pushSSE('self-toast', {
      id: `self-${notif.id}`,
      type,
      title,
      message: selfToastMessage,
      createdAt: notif.createdAt.toISOString(),
    }, [actorId]);
  }

  // Notification système (Web Push) aux mêmes destinataires — non bloquant
  const pushUrl = orderId || quoteId ? `/admin/requests?open=${orderId ?? quoteId}`
    : clientId ? `/admin/clients?open=${clientId}`
    : link ?? '/admin/dashboard';
  sendPushToUsers(uniqueIds.map((u) => u.id), { title, body: message, url: pushUrl, tag: notif.id })
    .catch(() => {});

  return { notif, userIds: uniqueIds.map((u) => u.id) };
}
