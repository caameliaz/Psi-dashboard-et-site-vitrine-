import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { auth } from './auth';
import { seesAll, hasPermission, type PermKey } from './permissions';
import { resolveClientVisibility } from './leave';

// ── Contrôle d'accès PAR OBJET (anti-IDOR) ───────────────────────────────────────────────────
// requirePermission() dit « a le droit d'utiliser cette fonction » ; ces helpers disent « a le
// droit de voir CET objet-là ». Mêmes règles que les listes /api/orders, /api/quotes et
// /api/clients : un ADMIN (ou compte « voir_tout ») voit tout ; un commercial ne voit que ses
// demandes (assignedToId), celles de ses clients, et ce que lui confie un congé (cf. leave.ts).

type SessionUser = { id: string; role?: string; permissions?: string[] } & Record<string, unknown>;

export const notFound = (what = 'Introuvable') => NextResponse.json({ error: what }, { status: 404 });

/** Vrai si l'utilisateur peut accéder à cette commande/ce devis. */
export async function canAccessRequest(user: SessionUser, kind: 'order' | 'quote', id: string): Promise<boolean> {
  if (seesAll(user as never)) return true;
  const row = kind === 'order'
    ? await prisma.order.findUnique({ where: { id }, select: { assignedToId: true, clientId: true, createdAt: true } })
    : await prisma.quote.findUnique({ where: { id }, select: { assignedToId: true, clientId: true, createdAt: true } });
  if (!row) return true; // inexistant : la route renverra son propre 404, rien à protéger
  if (row.assignedToId === user.id) return true;
  if (!row.clientId) return false;
  const { historyClientIds, interimSince } = await resolveClientVisibility(user.id);
  if (historyClientIds.includes(row.clientId)) return true;
  return interimSince.some((s) => s.clientId === row.clientId && row.createdAt >= s.since);
}

/** Vrai si l'utilisateur peut accéder à cette fiche client (les siens + ceux d'un congé). */
export async function canAccessClient(user: SessionUser, clientId: string): Promise<boolean> {
  if (seesAll(user as never)) return true;
  const { visibleClientIds } = await resolveClientVisibility(user.id);
  return visibleClientIds.includes(clientId);
}

/** Session + permission + accès à la commande/au devis. Renvoie { error } (404 si hors périmètre). */
export async function guardRequestAccess(perm: PermKey, kind: 'order' | 'quote', id: string) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), session: null };
  if (!hasPermission(session.user as never, perm)) {
    return { error: NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 }), session: null };
  }
  if (!(await canAccessRequest(session.user as never, kind, id))) {
    return { error: notFound(kind === 'order' ? 'Commande introuvable' : 'Devis introuvable'), session: null };
  }
  return { error: null, session };
}

/** Réservé aux ADMIN. */
export async function requireAdmin() {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), session: null };
  if (session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

/**
 * Filtre Prisma « mes commandes/devis » (mêmes règles que les listes) à fusionner dans un `where`
 * — `null` si l'utilisateur voit tout (ADMIN / voir_tout). À utiliser pour tout export ou agrégat.
 */
export async function ownRequestsWhere(user: SessionUser): Promise<Record<string, unknown> | null> {
  if (seesAll(user as never)) return null;
  const { historyClientIds, interimSince } = await resolveClientVisibility(user.id);
  return {
    OR: [
      { assignedToId: user.id },
      { clientId: { in: historyClientIds } },
      ...interimSince.map(({ clientId, since }) => ({ clientId, createdAt: { gte: since } })),
    ],
  };
}

/** Session + AU MOINS UNE des permissions données (ADMIN passe toujours). */
export async function requireAnyPermission(perms: PermKey[]) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), session: null };
  if (!perms.some((p) => hasPermission(session.user as never, p))) {
    return { error: NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}

/** Session + permission + accès à CETTE fiche client (ses clients / ceux confiés par un congé). */
export async function guardClientAccess(perm: PermKey, clientId: string) {
  const session = await auth();
  if (!session) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), session: null };
  if (!hasPermission(session.user as never, perm)) {
    return { error: NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 }), session: null };
  }
  if (!(await canAccessClient(session.user as never, clientId))) {
    return { error: notFound('Client introuvable'), session: null };
  }
  return { error: null, session };
}
