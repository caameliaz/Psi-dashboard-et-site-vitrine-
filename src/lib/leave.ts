// ─── Congés & intérim ─────────────────────────────────────────────────────────
// Logique de résolution "à la volée" : pas de tâche planifiée. À chaque appel,
// on compare simplement endDate à la date courante pour savoir si un congé
// (status ACTIVE en base) est encore en cours ou déjà terminé dans les faits.
// Un congé ACTIVE dont endDate est dépassée est traité comme terminé PARTOUT
// (visibilité, assignation de clients...) sans qu'aucune écriture ne soit
// nécessaire — la bascule redevient explicite (status ENDED) seulement quand
// un admin clôture manuellement, ou à la prochaine action qui touche ce congé.
import { prisma } from '@/lib/prisma';

/** Vrai si ce congé est, EN CE MOMENT, toujours en cours (indépendamment de `status` en base). */
export function isLeaveCurrentlyActive(leave: { status: string; endDate: Date }): boolean {
  return leave.status === 'ACTIVE' && leave.endDate.getTime() > Date.now();
}

/**
 * Congé actif (au sens `isLeaveCurrentlyActive`) où `userId` est en congé — s'il y en a un.
 * Un employé n'a normalement qu'un seul congé actif à la fois, mais on prend le plus
 * récent par sécurité si jamais plusieurs se chevauchent.
 */
export async function getActiveLeaveAsEmployee(userId: string) {
  const leaves = await prisma.leaveAssignment.findMany({
    where: { employeeId: userId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });
  return leaves.find(isLeaveCurrentlyActive) ?? null;
}

/** Tous les congés actifs (au sens réel) où `userId` est le remplaçant. */
export async function getActiveLeavesAsSubstitute(userId: string) {
  const leaves = await prisma.leaveAssignment.findMany({
    where: { substituteId: userId, status: 'ACTIVE' },
  });
  return leaves.filter(isLeaveCurrentlyActive);
}

/**
 * Termine un congé si sa date de fin est dépassée : remet les clients confiés au
 * titulaire (Client.assignedToId) et marque le congé ENDED. Idempotent — ne fait
 * rien si le congé est déjà ENDED ou pas encore terminé. À appeler paresseusement
 * (au moment d'une lecture concernant ce congé) pour matérialiser la bascule
 * dès qu'elle est constatée, sans tâche planifiée.
 */
export async function reclaimIfExpired(leave: {
  id: string; status: string; endDate: Date; employeeId: string; clientIds: string[];
}) {
  if (leave.status !== 'ACTIVE' || leave.endDate.getTime() > Date.now()) return false;

  await prisma.$transaction([
    prisma.client.updateMany({
      where: { id: { in: leave.clientIds } },
      data: { assignedToId: leave.employeeId },
    }),
    prisma.leaveAssignment.update({
      where: { id: leave.id },
      data: { status: 'ENDED', endedAt: leave.endDate },
    }),
  ]);
  return true;
}

/** Passe en revue tous les congés ACTIVE dont la date de fin est dépassée et les clôture. */
export async function reclaimAllExpiredLeaves() {
  const candidates = await prisma.leaveAssignment.findMany({
    where: { status: 'ACTIVE', endDate: { lte: new Date() } },
  });
  for (const leave of candidates) {
    await reclaimIfExpired(leave);
  }
}

/**
 * Termine un congé manuellement, avant sa date de fin (action admin, avec confirmation
 * côté UI). Remet immédiatement les clients au titulaire.
 */
export async function endLeaveNow(leaveId: string, endedById: string) {
  const leave = await prisma.leaveAssignment.findUnique({ where: { id: leaveId } });
  if (!leave || leave.status !== 'ACTIVE') return null;

  await prisma.$transaction([
    prisma.client.updateMany({
      where: { id: { in: leave.clientIds } },
      data: { assignedToId: leave.employeeId },
    }),
    prisma.leaveAssignment.update({
      where: { id: leaveId },
      data: { status: 'ENDED', endedAt: new Date(), endedById },
    }),
  ]);
  return true;
}

/**
 * Résout les infos de visibilité pour un utilisateur non-admin :
 * - `visibleClientIds`: null = pas de restriction par client (ne devrait pas arriver
 *   pour un EMPLOYEE sans congé/substitution, cf. clientIds toujours filtré par
 *   assignedToId côté appelant) ; sinon liste des clients que cet utilisateur peut voir.
 * - `historyClientIds`: sous-ensemble de `visibleClientIds` pour lesquels l'utilisateur
 *   voit aussi l'historique complet (commandes antérieures à son intérim).
 *
 * Règles :
 * - Ses propres clients assignés (Client.assignedToId = userId) → toujours visibles,
 *   historique complet.
 * - S'il est remplaçant d'un congé actif → les clients confiés pour ce congé sont
 *   visibles ; historique complet SEULEMENT si allowFullHistory est coché sur ce congé
 *   (sinon il ne verra, via le filtre commande, que les commandes créées pendant l'intérim
 *   — cf. resolveOrderVisibility).
 */
export async function resolveClientVisibility(userId: string) {
  await reclaimAllExpiredLeaves();

  const [ownClients, substituteLeaves] = await Promise.all([
    prisma.client.findMany({ where: { assignedToId: userId }, select: { id: true } }),
    getActiveLeavesAsSubstitute(userId),
  ]);

  // Clients confiés SANS accès historique complet pendant l'intérim : même si
  // Client.assignedToId pointe maintenant vers le remplaçant (bascule immédiate à
  // la création du congé — cf. POST /api/leaves), la restriction du congé doit
  // primer. Sinon `ownClients` ci-dessous les classerait à tort comme "propres
  // clients historiques" et contournerait totalement la case allowFullHistory.
  const restrictedClientIds = new Set(
    substituteLeaves.filter((l) => !l.allowFullHistory).flatMap((l) => l.clientIds)
  );

  const visibleClientIds = new Set(ownClients.map((c) => c.id));
  const historyClientIds = new Set(
    ownClients.map((c) => c.id).filter((id) => !restrictedClientIds.has(id))
  );
  const interimSince: { clientId: string; since: Date }[] = [];

  for (const leave of substituteLeaves) {
    // Seuil réel de "pendant l'intérim" : jamais avant l'instant où le congé a été
    // déclaré (leave.createdAt). Si on utilisait startDate tel quel, un congé démarrant
    // "aujourd'hui" (minuit) laisserait passer les commandes créées PLUS TÔT ce même
    // jour, avant même que l'admin ait déclaré le congé — faille de confidentialité.
    const since = leave.startDate.getTime() > leave.createdAt.getTime() ? leave.startDate : leave.createdAt;
    for (const clientId of leave.clientIds) {
      visibleClientIds.add(clientId);
      if (leave.allowFullHistory) {
        historyClientIds.add(clientId);
      } else {
        interimSince.push({ clientId, since });
      }
    }
  }

  return {
    visibleClientIds: [...visibleClientIds],
    historyClientIds: [...historyClientIds],
    // Pour les clients en intérim SANS accès historique complet : ne montrer que
    // les commandes/devis créés à partir du début du congé.
    interimSince,
  };
}
