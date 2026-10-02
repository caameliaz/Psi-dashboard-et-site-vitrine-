import { prisma } from './prisma';

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE: 'Contacté',
  VALIDE: 'Validé',
  PRODUITE: 'Disponible',
  LIVRE: 'Livré',
  RETOURNE: 'Retourné',
  ANNULE: 'Annulé',
};

export function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s;
}

// Journal des CONNEXIONS : action « Connexion » (entité UTILISATEUR). Visible dans l'Historique par ce seul compte.
export const LOGIN_ACTION = 'Connexion';
export const LOGIN_LOG_VIEWER_EMAIL = 'cameliamerniz@gmail.com';

type Entity = 'COMMANDE' | 'DEVIS' | 'PRODUIT' | 'CLIENT' | 'UTILISATEUR' | 'CONTENU' | 'TEMPLATE' | 'STATUT' | 'STOCK' | 'MATIERE';

export function createAudit({
  userId,
  action,
  entity,
  entityId,
  detail,
  orderId,
  quoteId,
}: {
  userId: string | null | undefined;
  action: string;
  entity: Entity;
  entityId?: string | null;
  detail?: string | null;
  orderId?: string | null;
  quoteId?: string | null;
}) {
  if (!userId) return;
  prisma.auditLog.create({
    data: {
      userId,
      action,
      entity,
      entityId: entityId ?? null,
      detail: detail ?? null,
      orderId: orderId ?? null,
      quoteId: quoteId ?? null,
    },
  }).catch(console.error);
}
