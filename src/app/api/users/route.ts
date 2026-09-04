import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    // Sinon, retourner tous les users avec toutes les infos
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, permissions: true, resetRequested: true },
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

  try {
    const body = await req.json();
    const { name, email, password, role, permissions } = body;

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

    // Verifier si email deja utilise (seulement si fourni)
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
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
        email: email?.trim() || null,
        password: hashedPassword,
        role,
        active: true,
        permissions: role === 'ADMIN' ? [] : (permissions || []),
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
