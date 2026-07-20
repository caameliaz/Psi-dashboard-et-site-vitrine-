import { createNotif } from './notifications';
import { pushSSE } from './sse-bus';
import { prisma } from './prisma';

// Notifie UNIQUEMENT l'utilisateur assigné qu'une demande lui a été confiée.
export async function notifyAssignment({
  actorId,
  actorName,
  assignedToId,
  entityType,
  clientLabel,
  ref,
  orderId,
  quoteId,
}: {
  actorId: string;
  actorName: string;
  assignedToId: string;
  entityType: 'commande' | 'devis';
  clientLabel: string;
  ref: string;
  orderId?: string;
  quoteId?: string;
}) {
  if (!assignedToId || assignedToId === actorId) return;
  const titre = entityType === 'commande' ? 'Commande assignée' : 'Devis assigné';
  const notif = await prisma.notification.create({
    data: {
      type: 'ACTION_AUTRE',
      title: titre,
      message: `${actorName} a assigné ${entityType === 'commande' ? 'la commande' : 'le devis'} ${ref} — ${clientLabel}`,
      orderId: orderId ?? null,
      quoteId: quoteId ?? null,
      reads: { create: [{ userId: assignedToId, read: false }] },
    },
  });
  pushSSE('activity', {
    id: notif.id,
    type: 'ACTION_AUTRE',
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
    targetUserId: assignedToId,
  }, [assignedToId]);
}

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE:   'Contacté',
  CONFIRME:   'Confirmé',
  LIVRE:      'Livré',
  ANNULE:     'Annulé',
  VALIDE:     'Validé',
  COMMANDE:   'Converti en commande',
};

export async function notifyStatusChange({
  actorId,
  actorName,
  entityType,
  clientLabel,
  newStatus,
  orderId,
  quoteId,
}: {
  actorId: string;
  actorName: string;
  entityType: 'commande' | 'devis';
  clientLabel: string;
  newStatus: string;
  orderId?: string;
  quoteId?: string;
}) {
  const label = STATUS_LABELS[newStatus] ?? newStatus;
  const title = entityType === 'commande' ? 'Commande mise à jour' : 'Devis mis à jour';
  const message = `${actorName} — ${entityType} de ${clientLabel} → ${label}`;

  const isAnnulation = newStatus === 'ANNULE';
  const entityLabel = entityType === 'commande' ? 'la commande' : 'le devis';
  const { notif, userIds } = await createNotif({
    type: isAnnulation ? 'ANNULATION' : 'ACTION_AUTRE',
    title,
    message,
    actorId,
    orderId,
    quoteId,
    selfToastMessage: isAnnulation
      ? `Vous avez annulé ${entityLabel}`
      : `Vous avez mis à jour ${entityLabel} → ${label}`,
  });

  pushSSE('activity', {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  }, userIds);
}

export async function notifyUserCreated({
  actorId,
  actorName,
  userName,
}: {
  actorId: string;
  actorName: string;
  userName: string;
}) {
  const { notif, userIds } = await createNotif({
    type: 'ACTION_AUTRE',
    title: 'Nouvel utilisateur',
    message: `${actorName} a créé le compte de ${userName}`,
    actorId,
    adminOnly: true,
    selfToastMessage: `Vous avez créé le compte de ${userName}`,
  });

  pushSSE('activity', {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  }, userIds);
}

export async function notifyDeletion({
  actorId,
  actorName,
  entityType,
  label,
}: {
  actorId: string;
  actorName: string;
  entityType: string;
  label: string;
}) {
  const { notif, userIds } = await createNotif({
    type: 'ACTION_AUTRE',
    title: 'Suppression',
    message: `${actorName} a supprimé ${entityType} : ${label}`,
    actorId,
    selfToastMessage: `Vous avez supprimé ${entityType} : ${label}`,
  });

  pushSSE('activity', {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  }, userIds);
}

export async function notifyCreation({
  actorId,
  actorName,
  entityType,
  label,
  orderId,
  quoteId,
}: {
  actorId: string;
  actorName: string;
  entityType: string;
  label: string;
  orderId?: string;
  quoteId?: string;
}) {
  const capitalType = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  const { notif, userIds } = await createNotif({
    type: 'ACTION_AUTRE',
    title: `${capitalType} — Manuel`,
    message: `${actorName} a créé ${entityType} : ${label}`,
    actorId,
    orderId,
    quoteId,
    selfToastMessage: `Vous avez créé ${entityType} : ${label}`,
  });

  pushSSE('activity', {
    id: notif.id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  }, userIds);
}
