import { createNotif } from './notifications';
import { pushSSE } from './sse-bus';
import { prisma } from './prisma';

// Notifie UNIQUEMENT l'utilisateur assigné qu'une demande lui a été confiée.
// (l'assigné ne reçoit rien s'il s'assigne lui-même)
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
  if (!assignedToId || assignedToId === actorId) return; // pas de notif pour soi-même
  const notif = await prisma.notification.create({
    data: {
      type: 'ACTION_AUTRE',
      title: 'Demande assignée',
      message: `${actorName} vous a confié ${entityType} ${ref} — ${clientLabel}`,
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
  });
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
  const notif = await createNotif({
    type: isAnnulation ? 'ANNULATION' : 'ACTION_AUTRE',
    title,
    message,
    actorId,
    actorOnly: !isAnnulation,
    orderId,
    quoteId,
  });

  pushSSE('activity', {
    id: notif.id,
    type: 'ACTION_AUTRE',
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  });
}

export async function notifyConversion({
  actorId,
  actorName,
  clientLabel,
  quoteRef,
  orderId,
  quoteId,
}: {
  actorId: string;
  actorName: string;
  clientLabel: string;
  quoteRef: string;
  orderId?: string;
  quoteId?: string;
}) {
  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title: 'Devis converti en commande',
    message: `${actorName} a converti le devis de ${clientLabel} (${quoteRef}) en commande`,
    actorId,
    orderId,
    quoteId,
  });

  pushSSE('activity', {
    id: notif.id,
    type: 'ACTION_AUTRE',
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  });
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
  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title: 'Nouvel utilisateur',
    message: `${actorName} a créé le compte de ${userName}`,
    actorId,
    adminOnly: true,
  });

  pushSSE('activity', {
    id: notif.id,
    type: 'ACTION_AUTRE',
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  });
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
  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title: 'Suppression',
    message: `${actorName} a supprimé ${entityType} : ${label}`,
    actorId,
  });

  pushSSE('activity', {
    id: notif.id,
    type: 'ACTION_AUTRE',
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  });
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
  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title: `${capitalType} — Manuel`,
    message: `${actorName} a créé ${entityType} : ${label}`,
    actorId,
    orderId,
    quoteId,
  });

  pushSSE('activity', {
    id: notif.id,
    type: 'ACTION_AUTRE',
    title: notif.title,
    message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  });
}
