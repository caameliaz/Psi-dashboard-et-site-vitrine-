import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { endLeaveNow } from '@/lib/leave';

// POST /api/leaves/[id]/end — termine un congé manuellement, avant sa date de fin
// (bouton "Terminer maintenant" avec confirmation côté UI). Remet immédiatement
// les clients confiés à l'employé titulaire.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session!;
  const { id } = await params;

  try {
    const leave = await prisma.leaveAssignment.findUnique({
      where: { id },
      include: { employee: { select: { name: true } }, substitute: { select: { name: true } } },
    });
    if (!leave) return NextResponse.json({ error: 'Congé introuvable' }, { status: 404 });
    if (leave.status !== 'ACTIVE') return NextResponse.json({ error: 'Ce congé est déjà terminé' }, { status: 409 });

    await endLeaveNow(id, session.user.id);

    createAudit({
      userId: session.user.id,
      action: 'Congé terminé manuellement',
      entity: 'UTILISATEUR',
      entityId: leave.employeeId,
      detail: `${leave.employee.name} — clients repris à ${leave.substitute.name}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to end leave' }, { status: 500 });
  }
}
