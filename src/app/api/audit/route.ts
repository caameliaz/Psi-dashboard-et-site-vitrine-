import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { OWNER_ONLY_ACTIONS, LOGIN_LOG_VIEWER_EMAILS } from '@/lib/audit';

// GET /api/audit — journal d'audit (permission voir_historique)
// Admin : toutes les actions
// Employé : ses propres actions uniquement
export async function GET(request: NextRequest) {
  const guard = await requirePermission('voir_historique');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 50);
  const skip = (page - 1) * limit;

  const isAdmin = session.user.role === 'ADMIN';
  // Les connexions des utilisateurs ne sont visibles QUE par un compte (pas même les autres admins)
  const canSeeLogins = LOGIN_LOG_VIEWER_EMAILS.includes((session.user.email ?? '').trim().toLowerCase());
  const where = {
    ...(isAdmin ? {} : { userId: session.user.id }),
    ...(canSeeLogins ? {} : { NOT: { action: { in: OWNER_ONLY_ACTIONS } } }),
  };

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, role: true, customRole: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
