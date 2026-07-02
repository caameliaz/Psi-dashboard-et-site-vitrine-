import { prisma } from './prisma';

const STATUS_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  CONTACTE: 'Contacté',
  VALIDE: 'Validé',
  LIVRE: 'Livré',
  ANNULE: 'Annulé',
};

export function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s;
}

type Entity = 'COMMANDE' | 'DEVIS' | 'PRODUIT' | 'CLIENT' | 'UTILISATEUR' | 'CONTENU' | 'TEMPLATE' | 'STATUT';

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
