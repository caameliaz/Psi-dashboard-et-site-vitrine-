import { prisma } from './prisma';
import { OWNER_EMAIL } from './owner';

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
export const LOGIN_LOG_VIEWER_EMAIL = OWNER_EMAIL;
// Comptes autorisés à voir les connexions / pages consultées : la propriétaire + le compte « admin2 »
export const LOGIN_LOG_VIEWER_EMAILS = [OWNER_EMAIL, 'yms211201@gmail.com'];
// Journal des PAGES consultées par les comptes en lecture seule (investisseurs…) — même visibilité que les connexions.
export const PAGE_VIEW_ACTION = 'Page consultée';
// Changement de mot de passe fait par l'utilisateur lui-même : remet à zéro le compte de ses réinitialisations
// « Mot de passe oublié » (comptées via les notifications « Mot de passe réinitialisé », cf. api/profile).
export const PASSWORD_CHANGED_ACTION = 'Mot de passe modifié par l\'utilisateur';
export const PASSWORD_RESET_NOTIF_TITLE = 'Mot de passe réinitialisé'; // titre de la notif créée par /api/password-reset
// À partir de ce nombre de réinitialisations (depuis son dernier changement de mot de passe), on lui rappelle
// qu'il peut choisir son propre mot de passe depuis son profil.
export const RESET_REMINDER_THRESHOLD = 2;
// Actions du journal visibles par la propriétaire UNIQUEMENT (ni les autres admins, ni la personne concernée)
// — toutes comptent comme du « bruit », pas de l'activité (suppression de compte, cf. api/users/[id]).
export const OWNER_ONLY_ACTIONS = [LOGIN_ACTION, PAGE_VIEW_ACTION, PASSWORD_CHANGED_ACTION];

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
