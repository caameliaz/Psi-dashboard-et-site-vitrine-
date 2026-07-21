import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/profile — infos de l'utilisateur connecté
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(user);
}

// PATCH /api/profile — met à jour ses propres infos OU son mot de passe
// Body infos : { name?, phone? }
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
      return NextResponse.json({ success: true, passwordChanged: true });
    }

    // ─── Mise à jour des infos ───
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
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
