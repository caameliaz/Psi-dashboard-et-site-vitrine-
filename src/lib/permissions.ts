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
  { key: 'voir_stock',         label: 'Voir le stock',                  short: 'Voir stock'          },
  { key: 'modifier_stock',     label: 'Modifier le stock',              short: 'Modifier stock'      },
  // Distincte de voir_stock : un employé "production" peut voir/gérer les listes
  // d'achat et de production sans forcément voir les chiffres de stock global.
  { key: 'voir_listes_stock',  label: "Voir les listes d'achat & production", short: 'Listes stock'  },
  // Onglet "Stock par commercial" (page Stock) — réservé, pas ouvert à tous ceux
  // qui ont voir_stock (cf. STOCK-MOBILE.md).
  { key: 'voir_stock_commercial', label: 'Voir le stock par commercial', short: 'Stock commercial'   },
  { key: 'voir_historique',    label: "Voir l'historique",              short: 'Voir historique'     },
  { key: 'recevoir_recaps',    label: 'Recevoir les récaps par email',  short: 'Récaps email'        },
  { key: 'modifier_contenu',   label: 'Modifier le contenu du site',    short: 'Modifier contenu'    },
  { key: 'gerer_utilisateurs', label: 'Gérer les utilisateurs',         short: 'Gérer utilisateurs'  },
  // ── Compte « admin lecture seule » (cf. LECTURE_SEULE_PRESET) ──
  { key: 'voir_tout',          label: 'Voir TOUS les clients, commandes & ventes (pas seulement les siens)', short: 'Voir tous clients/ventes' },
  { key: 'voir_contenu',       label: 'Consulter le contenu du site & les messages (sans modifier)', short: 'Voir contenu du site' },
  { key: 'lecture_seule',      label: 'LECTURE SEULE : bloque TOUTE modification, création et suppression', short: 'Lecture seule' },
] as const;

export type PermKey = typeof ALL_PERMISSIONS[number]['key'];

// Permissions RESTRICTIVES : elles retirent des droits au lieu d'en donner → jamais incluses
// dans « Tout » ni dans les droits d'un ADMIN.
export const RESTRICTIVE_PERMS: PermKey[] = ['lecture_seule'];

export const ALL_PERM_KEYS: PermKey[] = ALL_PERMISSIONS.map((p) => p.key).filter((k) => !RESTRICTIVE_PERMS.includes(k));

// Profil « admin lecture seule » : voit tout (clients, commandes, dashboard, produits, stock,
// recettes, messages, contenu du site) et ne peut RIEN modifier (verrou serveur : src/proxy.ts).
export const LECTURE_SEULE_PRESET: PermKey[] = [
  'voir_tout', 'voir_commandes', 'voir_clients', 'voir_produits', 'voir_stock',
  'voir_contenu', 'lecture_seule',
];

// Permissions par défaut d'un employé (si aucune n'est explicitement définie)
export const EMPLOYE_DEFAULT_PERMS: PermKey[] = [
  'voir_commandes', 'modifier_statuts', 'voir_clients', 'voir_produits', 'voir_historique',
];

type SessionUser = (Session['user'] & { role?: string; permissions?: string[] }) | undefined;

/**
 * Retourne la liste effective des permissions d'un utilisateur de session.
 * Un employé a EXACTEMENT ses permissions stockées (pas de fallback "défaut" :
 * un tableau vide signifie que l'admin a tout retiré volontairement).
 * Les permissions par défaut (EMPLOYE_DEFAULT_PERMS) ne servent qu'à PRÉ-COCHER
 * le formulaire de création, jamais à décider des droits d'un compte existant.
 */
export function getPermissions(user: SessionUser): PermKey[] {
  if (!user) return [];
  if (user.role === 'ADMIN') return [...ALL_PERM_KEYS];
  return (user.permissions ?? []) as PermKey[];
}

/** Voit tous les clients/commandes/ventes (ADMIN, ou compte avec « voir_tout »). */
export function seesAll(user: SessionUser): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || ((user.permissions ?? []) as string[]).includes('voir_tout');
}

/** Compte en lecture seule (jamais un ADMIN) : toute écriture est refusée côté serveur (cf. proxy.ts). */
export function isReadOnly(user: SessionUser): boolean {
  if (!user || user.role === 'ADMIN') return false;
  return ((user.permissions ?? []) as string[]).includes('lecture_seule');
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
