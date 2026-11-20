import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { PASSWORD_RESET_NOTIF_TITLE, PASSWORD_CHANGED_ACTION, RESET_REMINDER_THRESHOLD } from '@/lib/audit';

// GET /api/profile — infos de l'utilisateur connecté
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, customRole: { select: { name: true } }, createdAt: true, recapDaily: true, recapWeekly: true },
  });
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Réinitialisations « Mot de passe oublié » depuis son dernier changement de mot de passe à lui.
  // Au-delà du seuil, l'app lui rappelle qu'il peut choisir son propre mot de passe (cf. PasswordResetReminder).
  const dernierChangement = await prisma.auditLog.findFirst({
    where: { userId: user.id, action: PASSWORD_CHANGED_ACTION },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  // Comptées via les notifications « Mot de passe réinitialisé » (une par demande, message « Nom (email) a demandé… »),
  // ce qui inclut aussi les demandes faites avant que ce rappel existe.
  const resetCount = await prisma.notification.count({
    where: {
      title: PASSWORD_RESET_NOTIF_TITLE,
      message: { contains: `(${user.email})`, mode: 'insensitive' },
      ...(dernierChangement ? { createdAt: { gt: dernierChangement.createdAt } } : {}),
    },
  });
  return NextResponse.json({ ...user, resetCount, suggestOwnPassword: resetCount >= RESET_REMINDER_THRESHOLD });
}

// PATCH /api/profile — met à jour ses propres infos OU son mot de passe
// Body infos : { name?, phone?, recapDaily?, recapWeekly? }
// Body mot de passe : { currentPassword, newPassword }
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await request.json();

    // ─── Changement de mot de passe ───
    if (body.newPassword !== undefined) {
      if (!body.currentPassword) return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 });
      if (String(body.newPassword).length < 6) return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères' }, { status: 400 });

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
      if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

      const ok = await bcrypt.compare(body.currentPassword, user.password);
      if (!ok) return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });

      await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(body.newPassword, 10) } });
      // Remet à zéro le compte des réinitialisations « Mot de passe oublié » (cf. GET ci-dessus)
      await prisma.auditLog
        .create({ data: { userId, action: PASSWORD_CHANGED_ACTION, entity: 'UTILISATEUR', entityId: userId } })
        .catch(console.error);
      return NextResponse.json({ success: true, passwordChanged: true });
    }

    // ─── Mise à jour des infos ───
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        // Préférences d'emails récap (admins) — désabonnement depuis le profil
        ...(body.recapDaily !== undefined && { recapDaily: Boolean(body.recapDaily) }),
        ...(body.recapWeekly !== undefined && { recapWeekly: Boolean(body.recapWeekly) }),
      },
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    // name est @unique → gère le doublon proprement
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Ce nom est déjà utilisé' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 });
  }
}
