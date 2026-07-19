// ── Permissions ──────────────────────────────────────────────────────────────
// Source de vérité unique pour les permissions (serveur + UI).
// Un ADMIN a toutes les permissions d'office. Un EMPLOYEE a celles stockées
// dans son champ `permissions` (les cases cochées à la création).

import type { Session } from 'next-auth';

export const ALL_PERMISSIONS = [
  { key: 'voir_commandes',     label: 'Voir les commandes & devis',     short: 'Voir commandes'      },
  { key: 'modifier_statuts',   label: 'Modifier les statuts',           short: 'Modifier statuts'    },
  { key: 'assign_commandes',   label: 'Assigner les commandes & devis', short: 'Assigner'            },
  { key: 'reassigner_client',  label: 'Ré-assigner une demande à un autre client', short: 'Ré-assigner client' },
  { key: 'voir_clients',       label: 'Voir les fiches clients',        short: 'Voir clients'        },
  { key: 'modifier_clients',   label: 'Modifier / ajouter des clients', short: 'Modifier clients'    },
  { key: 'voir_produits',      label: 'Voir les produits',              short: 'Voir produits'       },
  { key: 'modifier_produits',  label: 'Modifier les produits',          short: 'Modifier produits'   },
  { key: 'voir_historique',    label: "Voir l'historique",              short: 'Voir historique'     },
  { key: 'modifier_contenu',   label: 'Modifier le contenu du site',    short: 'Modifier contenu'    },
  { key: 'gerer_utilisateurs', label: 'Gérer les utilisateurs',         short: 'Gérer utilisateurs'  },
] as const;

export type PermKey = typeof ALL_PERMISSIONS[number]['key'];

export const ALL_PERM_KEYS: PermKey[] = ALL_PERMISSIONS.map((p) => p.key);

// Permissions par défaut d'un employé (si aucune n'est explicitement définie)
export const EMPLOYE_DEFAULT_PERMS: PermKey[] = [
  'voir_commandes', 'modifier_statuts', 'voir_clients', 'voir_produits', 'voir_historique',
];

type SessionUser = (Session['user'] & { role?: string; permissions?: string[] }) | undefined;

/** Retourne la liste effective des permissions d'un utilisateur de session. */
export function getPermissions(user: SessionUser): PermKey[] {
  if (!user) return [];
  if (user.role === 'ADMIN') return [...ALL_PERM_KEYS];
  const perms = user.permissions;
  if (perms && perms.length > 0) return perms as PermKey[];
  return [...EMPLOYE_DEFAULT_PERMS];
}

/** Vrai si l'utilisateur possède la permission demandée (ADMIN = toujours). */
export function hasPermission(user: SessionUser, perm: PermKey): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return getPermissions(user).includes(perm);
}

// ── Garde pour les routes API ────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { auth } from './auth';

/**
 * Vérifie session + permission dans une route API.
 * Retourne { error: NextResponse } si refusé, sinon { session }.
 *
 * Usage :
 *   const guard = await requirePermission('modifier_produits');
 *   if (guard.error) return guard.error;
 *   // ... guard.session est disponible
 */
export async function requirePermission(perm: PermKey) {
  const session = await auth();
  if (!session) {
    return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), session: null };
  }
  if (!hasPermission(session.user as SessionUser, perm)) {
    return { error: NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
