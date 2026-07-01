import { createNotif } from './notifications';
import { pushSSE } from './sse-bus';

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE:  'En attente',
  CONTACTE:    'Contacté',
  CONFIRME:    'Confirmé',
  LIVRE:       'Livré',
  ANNULE:      'Annulé',
  VALIDE:      'Validé',
  COMMANDE:    'Converti en commande',
};

export async function notifyStatusChange({
  actorName,
  entityType,
  ref,
  newStatus,
  orderId,
  quoteId,
}: {
  actorName: string;
  entityType: 'commande' | 'devis';
  ref: string;
  newStatus: string;
  orderId?: string;
  quoteId?: string;
}) {
  const label = STATUS_LABELS[newStatus] ?? newStatus;
  const title = entityType === 'commande' ? 'Commande mise à jour' : 'Devis mis à jour';
  const message = `${actorName} — ${ref} → ${label}`;

  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title,
    message,
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

export async function notifyDeletion({
  actorName,
  entityType,
  label,
}: {
  actorName: string;
  entityType: string;
  label: string;
}) {
  const title = 'Suppression';
  const message = `${actorName} a supprimé ${entityType} : ${label}`;

  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title,
    message,
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
  actorName,
  entityType,
  label,
  orderId,
  quoteId,
}: {
  actorName: string;
  entityType: string;
  label: string;
  orderId?: string;
  quoteId?: string;
}) {
  const capitalType = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  const title = `${capitalType} — Manuel`;
  const message = `${actorName} a créé ${entityType} : ${label}`;

  const notif = await createNotif({
    type: 'ACTION_AUTRE',
    title,
    message,
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
