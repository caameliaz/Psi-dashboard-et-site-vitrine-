import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Mois courant au format "YYYY-MM"
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/goals?month=YYYY-MM — objectifs du mois (global + par user)
// Accessible à tout utilisateur connecté (pour afficher son propre objectif).
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const month = request.nextUrl.searchParams.get('month') || currentMonth();
  try {
    const goals = await prisma.monthlyGoal.findMany({ where: { month } });
    const global = goals.find((g) => g.userId == null)?.amount ?? 0;
    const byUser: Record<string, number> = {};
    goals.forEach((g) => { if (g.userId) byUser[g.userId] = g.amount; });
    return NextResponse.json({ month, global, byUser });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

// PUT /api/goals — définir les objectifs du mois (ADMIN uniquement)
// Body : { month?, global?: number, byUser?: { [userId]: number } }
// amount 0 (ou absent) supprime l'objectif correspondant.
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Seuls les admins peuvent définir les objectifs' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const month = body.month || currentMonth();

    // Objectif global (userId null) : @@unique multi-NULL non fiable → gestion manuelle
    if (body.global !== undefined) {
      const amount = Number(body.global) || 0;
      const existing = await prisma.monthlyGoal.findFirst({ where: { month, userId: null } });
      if (amount > 0) {
        if (existing) await prisma.monthlyGoal.update({ where: { id: existing.id }, data: { amount } });
        else await prisma.monthlyGoal.create({ data: { month, userId: null, amount } });
      } else if (existing) {
        await prisma.monthlyGoal.delete({ where: { id: existing.id } });
      }
    }

    // Objectifs par user
    if (body.byUser && typeof body.byUser === 'object') {
      for (const [userId, raw] of Object.entries(body.byUser)) {
        const amount = Number(raw) || 0;
        if (amount > 0) {
          await prisma.monthlyGoal.upsert({
            where: { month_userId: { month, userId } },
            create: { month, userId, amount },
            update: { amount },
          });
        } else {
          await prisma.monthlyGoal.deleteMany({ where: { month, userId } });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save goals' }, { status: 500 });
  }
}
