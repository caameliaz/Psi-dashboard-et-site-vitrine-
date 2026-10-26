import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { hasPermission } from '@/lib/permissions';

// GET /api/users — liste de tous les users (id + name) pour les dropdowns
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const assignable = searchParams.get('assignable') === 'true';

    // Si assignable=true, ne retourner que les users actifs avec id+name uniquement
    if (assignable) {
      const users = await prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(users);
    }

    // Sinon, retourner tous les users avec toutes les infos (emails, rôles, permissions) :
    // réservé à la gestion des utilisateurs.
    if (!hasPermission(session.user as never, 'gerer_utilisateurs')) {
      return NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 });
    }
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, customRoleId: true, active: true, permissions: true, resetRequested: true, twoFactorDisabled: true, canHardDelete: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error('[users] Erreur chargement users:', e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users — creer un nouvel utilisateur
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Créer un compte = permission « gerer_utilisateurs » (avant : n'importe quel connecté pouvait
  // se créer un compte ADMIN). Seul un ADMIN crée un ADMIN, et un non-admin n'accorde que les
  // permissions qu'il possède lui-même.
  if (!hasPermission(session.user as never, 'gerer_utilisateurs')) {
    return NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, permissions } = body;
    // Rôle personnalisé (étiquette) — ignoré pour un ADMIN ; doit exister
    let customRoleId: string | null = role === 'ADMIN' ? null : (typeof body.customRoleId === 'string' && body.customRoleId ? body.customRoleId : null);
    // (on garde aussi son nom : il est écrit dans l'e-mail de bienvenue)
    let customRoleName: string | null = null;
    if (customRoleId) {
      const cr = await prisma.customRole.findUnique({ where: { id: customRoleId }, select: { name: true } });
      if (cr) customRoleName = cr.name; else customRoleId = null;
    }

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Email optionnel mais si fourni, doit etre valide
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    if (!role || !['ADMIN', 'EMPLOYEE'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (session.user.role !== 'ADMIN') {
      if (role === 'ADMIN') return NextResponse.json({ error: 'Seul un administrateur peut créer un administrateur.' }, { status: 403 });
      const miennes = new Set(session.user.permissions ?? []);
      if (Array.isArray(permissions) && permissions.some((p: string) => !miennes.has(p))) {
        return NextResponse.json({ error: 'Vous ne pouvez accorder que des permissions que vous possédez.' }, { status: 403 });
      }
    }

    // Verifier si email deja utilise (seulement si fourni)
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email: { equals: String(email).trim(), mode: 'insensitive' } } });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creer l'utilisateur
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email?.trim().toLowerCase() || null, // toujours en minuscules (la connexion est insensible à la casse)
        password: hashedPassword,
        role,
        active: true,
        permissions: role === 'ADMIN' ? [] : (permissions || []),
        customRoleId,
      },
    });

    // Envoyer email de bienvenue si email fourni
    if (email) {
      try {
        const { renderWelcomeEmail } = await import('@/emails/accountCreatedTemplate');
        const { sendEmail } = await import('@/lib/email/send');
        const { logoAttachment } = await import('@/emails/shared');
        const mail = renderWelcomeEmail({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          roleName: customRoleName,
        });
        await sendEmail({
          to: email.trim(),
          subject: mail.subject,
          html: mail.html,
          attachments: [logoAttachment],
        });
      } catch (emailError) {
        console.error('[users] Erreur envoi email bienvenue:', emailError);
        // Ne pas bloquer la creation si l'email echoue
      }
    }

    console.log('[users] Utilisateur cree:', { id: user.id, name: user.name, email: user.email });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error('[users] Erreur creation user:', e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
