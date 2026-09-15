import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { createNotif } from '@/lib/notifications';
import { reclaimAllExpiredLeaves, isLeaveCurrentlyActive } from '@/lib/leave';

// GET /api/leaves — liste des congés (permission gerer_utilisateurs, réservé admin/RH)
// ?employeeId=<id> pour filtrer sur un employé (fiche employé)
export async function GET(request: NextRequest) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;

  // Clôture paresseuse : matérialise les congés dont la date de fin est dépassée
  // avant de renvoyer la liste, pour ne jamais afficher un congé "ACTIVE" périmé.
  await reclaimAllExpiredLeaves();

  const employeeId = request.nextUrl.searchParams.get('employeeId');

  try {
    const leaves = await prisma.leaveAssignment.findMany({
      where: employeeId ? { employeeId } : undefined,
      include: {
        employee: { select: { id: true, name: true } },
        substitute: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(leaves);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch leaves' }, { status: 500 });
  }
}

// POST /api/leaves — met un employé en congé (permission gerer_utilisateurs, admin uniquement)
// body: { employeeId, substituteId, startDate, endDate, clientIds: string[], allowFullHistory: boolean }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session!;

  try {
    const body = await request.json();
    const employeeId: string = body.employeeId;
    const substituteId: string = body.substituteId;
    const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : [];
    const allowFullHistory = Boolean(body.allowFullHistory);

    if (!employeeId || !substituteId) {
      return NextResponse.json({ error: 'Employé et remplaçant requis' }, { status: 400 });
    }
    if (employeeId === substituteId) {
      return NextResponse.json({ error: "Le remplaçant doit être différent de l'employé en congé" }, { status: 400 });
    }

    const startDate = body.startDate ? new Date(body.startDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : null;
    if (!endDate || isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime()) {
      return NextResponse.json({ error: 'Date de fin invalide (doit être après la date de début)' }, { status: 400 });
    }

    const [employee, substitute] = await Promise.all([
      prisma.user.findUnique({ where: { id: employeeId } }),
      prisma.user.findUnique({ where: { id: substituteId } }),
    ]);
    if (!employee) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    if (!substitute || !substitute.active) return NextResponse.json({ error: 'Remplaçant introuvable ou inactif' }, { status: 404 });

    // N'accepte que des clients réellement assignés à cet employé (pas de réassignation
    // "à l'aveugle" d'un client qui n'est même pas le sien).
    const ownedClients = clientIds.length
      ? await prisma.client.findMany({ where: { id: { in: clientIds }, assignedToId: employeeId }, select: { id: true } })
      : [];
    const validClientIds = ownedClients.map((c) => c.id);

    const leave = await prisma.$transaction(async (tx) => {
      const created = await tx.leaveAssignment.create({
        data: {
          employeeId,
          substituteId,
          startDate,
          endDate,
          clientIds: validClientIds,
          allowFullHistory,
          createdById: session.user.id,
        },
      });
      // Bascule immédiate si le congé démarre maintenant/dans le passé (cas normal :
      // l'admin déclare un congé qui commence tout de suite). S'il démarre dans le futur,
      // on ne touche pas encore les clients — cf. TODO limite ci-dessous.
      if (validClientIds.length && startDate.getTime() <= Date.now()) {
        await tx.client.updateMany({ where: { id: { in: validClientIds } }, data: { assignedToId: substituteId } });
      }
      return created;
    });

    createAudit({
      userId: session.user.id,
      action: 'Congé créé',
      entity: 'UTILISATEUR',
      entityId: employeeId,
      detail: `${employee.name} → remplacé par ${substitute.name} (${validClientIds.length} client(s), du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')})`,
    });

    // Le remplaçant est prévenu qu'il vient de recevoir des clients en intérim
    // (assignedToId sans orderId/quoteId → notif ciblée sur lui uniquement ;
    // actorId = l'admin créateur, exclu ensuite des destinataires persistés).
    createNotif({
      type: 'ACTION_AUTRE',
      title: 'Clients confiés en intérim',
      message: `${employee.name} est en congé du ${startDate.toLocaleDateString('fr-FR')} au ${endDate.toLocaleDateString('fr-FR')} — ${validClientIds.length} client(s) vous sont confiés.`,
      actorId: session.user.id,
      assignedToId: substituteId,
      link: '/admin/clients',
    }).catch(() => {});

    return NextResponse.json(leave, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create leave' }, { status: 500 });
  }
}
