import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

// POST /api/clients/assign — assigne plusieurs clients à un user en une fois
// (permission modifier_clients). body: { clientIds: string[], assignedToId: string | null }
// `assignedToId: null` désassigne (retire le responsable).
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;
  const session = guard.session!;

  try {
    const body = await request.json();
    const clientIds: string[] = Array.isArray(body.clientIds) ? body.clientIds : [];
    const assignedToId: string | null = body.assignedToId || null;

    if (clientIds.length === 0) {
      return NextResponse.json({ error: 'Sélectionne au moins un client' }, { status: 400 });
    }

    if (assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const result = await prisma.client.updateMany({
      where: { id: { in: clientIds } },
      data: { assignedToId },
    });

    createAudit({
      userId: session.user.id,
      action: assignedToId ? 'Clients assignés' : 'Clients désassignés',
      entity: 'CLIENT',
      detail: `${result.count} client(s)${assignedToId ? ` → ${assignedToId}` : ''}`,
    });

    return NextResponse.json({ ok: true, count: result.count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to assign clients' }, { status: 500 });
  }
}
