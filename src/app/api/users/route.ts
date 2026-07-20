import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email/send';
import { logoAttachment } from '@/emails/shared';
import { renderWelcomeEmail, renderAccountCreatedAdminEmail } from '@/emails/accountCreatedTemplate';

// GET /api/users — liste tous les utilisateurs (permission gerer_utilisateurs)
// GET /api/users?assignable=true — liste réduite (id + name) des users actifs,
//   accessible à quiconque peut voir les commandes (pour le dropdown "pris en charge par")
export async function GET(request: NextRequest) {
  const assignable = request.nextUrl.searchParams.get('assignable') === 'true';

  if (assignable) {
    const guard = await requirePermission('voir_commandes');
    if (guard.error) return guard.error;
    try {
      const users = await prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(users);
    } catch (e) {
      console.error(e);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
  }

  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        active: true, phone: true, photo: true, permissions: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users — créer un utilisateur (permission gerer_utilisateurs)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: 'name, email et password sont requis' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        role: body.role ?? 'EMPLOYEE',
        phone: body.phone ?? null,
        permissions: body.permissions ?? [],
      },
      select: {
        id: true, name: true, email: true, role: true,
        active: true, phone: true, photo: true, permissions: true, createdAt: true,
      },
    });

    createAudit({ userId: session.user.id, action: 'Utilisateur créé', entity: 'UTILISATEUR', entityId: user.id, detail: `${user.name} (${user.email})` });

    // ── Emails automatiques (bienvenue au user + récap aux admins) ──
    // Non bloquant : si l'envoi échoue, le compte reste créé.
    (async () => {
      try {
        // 1. Bienvenue au nouvel utilisateur (avec son mot de passe en clair)
        const welcome = renderWelcomeEmail({ name: user.name, email: user.email, password: body.password, role: user.role });
        await sendEmail({ to: user.email, subject: welcome.subject, html: welcome.html, attachments: [logoAttachment] });

        // 2. Récap aux admins (sauf le créateur pour éviter le doublon)
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', active: true, NOT: { id: session.user.id } },
          select: { email: true },
        });
        if (admins.length > 0) {
          const adminMail = renderAccountCreatedAdminEmail({
            name: user.name, email: user.email, role: user.role,
            createdBy: session.user.name ?? session.user.email ?? 'Un administrateur',
          });
          await Promise.all(admins.map((a) =>
            sendEmail({ to: a.email, subject: adminMail.subject, html: adminMail.html, attachments: [logoAttachment] })
          ));
        }
      } catch (err) {
        console.error('[users POST] envoi email échoué:', err);
      }
    })();

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
