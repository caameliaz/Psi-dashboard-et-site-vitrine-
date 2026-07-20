import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { pushSSE } from '@/lib/sse-bus';

// Crée une notification persistée pour une liste d'utilisateurs + push SSE (cloche).
// L'acteur (admin qui définit) est exclu pour ne pas se notifier lui-même.
async function notifyUsers(userIds: string[], actorId: string | null, title: string, message: string) {
  const targets = [...new Set(userIds)].filter((id) => id && id !== actorId);
  if (targets.length === 0) return;
  const notif = await prisma.notification.create({
    data: { type: 'ACTION_AUTRE', title, message, reads: { create: targets.map((userId) => ({ userId, read: false })) } },
  });
  pushSSE('activity', {
    id: notif.id, type: notif.type, title: notif.title, message: notif.message,
    createdAt: notif.createdAt.toISOString(),
  }, targets);
}

// Mois courant au format "YYYY-MM"
function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// "2026-07" → "juillet 2026"
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return `${MOIS_FR[(m || 1) - 1]} ${y}`;
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
    const actorId = session.user.id ?? null;
    const fmt = (n: number) => `${n.toLocaleString('fr-FR')} DA`;

    // Objectif global (userId null) : @@unique multi-NULL non fiable → gestion manuelle
    let globalChanged = false;
    let globalAmount = 0;
    if (body.global !== undefined) {
      const amount = Number(body.global) || 0;
      globalAmount = amount;
      const existing = await prisma.monthlyGoal.findFirst({ where: { month, userId: null } });
      if (amount > 0) {
        globalChanged = !existing || existing.amount !== amount; // set ou modifié
        if (existing) await prisma.monthlyGoal.update({ where: { id: existing.id }, data: { amount } });
        else await prisma.monthlyGoal.create({ data: { month, userId: null, amount } });
      } else if (existing) {
        await prisma.monthlyGoal.delete({ where: { id: existing.id } });
      }
    }

    // Objectifs par user — on note ceux qui sont réellement définis/modifiés (pour notifier)
    const changedUsers: { userId: string; amount: number }[] = [];
    if (body.byUser && typeof body.byUser === 'object') {
      for (const [userId, raw] of Object.entries(body.byUser)) {
        const amount = Number(raw) || 0;
        if (amount > 0) {
          const existing = await prisma.monthlyGoal.findUnique({ where: { month_userId: { month, userId } } });
          if (!existing || existing.amount !== amount) changedUsers.push({ userId, amount });
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

    // ── Notifications ────────────────────────────────────────────────────────
    const moisTxt = monthLabel(month);
    // Objectif entreprise défini/modifié → tout le monde
    if (globalChanged) {
      const everyone = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
      await notifyUsers(
        everyone.map((u) => u.id), actorId,
        'Objectif mensuel',
        `Nouvel objectif mensuel défini pour le mois de ${moisTxt} : ${fmt(globalAmount)}`,
      );
    }
    // Objectif personnel défini/modifié → la personne concernée
    for (const c of changedUsers) {
      await notifyUsers(
        [c.userId], actorId,
        'Votre objectif mensuel',
        `Votre objectif mensuel pour le mois de ${moisTxt} a été défini : ${fmt(c.amount)}`,
      );
    }

    // Toast de confirmation à l'admin qui définit (pas de notif persistée pour lui)
    if (actorId && (globalChanged || changedUsers.length > 0)) {
      let toast = 'Objectif défini';
      if (globalChanged && changedUsers.length === 0) toast = 'Objectif entreprise défini';
      else if (!globalChanged && changedUsers.length > 0) {
        const names = await prisma.user.findMany({ where: { id: { in: changedUsers.map((c) => c.userId) } }, select: { name: true } });
        toast = names.length === 1 ? `Objectif défini pour ${names[0].name}` : `Objectifs définis pour ${names.length} employés`;
      }
      pushSSE('self-toast', {
        id: `goal-${Date.now()}`, type: 'ACTION_AUTRE', title: 'Objectifs', message: toast,
        createdAt: new Date().toISOString(),
      }, [actorId]);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to save goals' }, { status: 500 });
  }
}
