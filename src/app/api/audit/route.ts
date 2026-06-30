import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/audit — journal d'audit
// Admin : toutes les actions
// Employé : ses propres actions uniquement
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 50);
  const skip = (page - 1) * limit;

  const isAdmin = session.user.role === 'ADMIN';

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: isAdmin ? undefined : { userId: session.user.id },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({
        where: isAdmin ? undefined : { userId: session.user.id },
      }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
