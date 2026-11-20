import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { genPassword } from '@/lib/gen-password';
import { sendEmail } from '@/lib/email/send';
import { logoAttachment } from '@/emails/shared';
import { renderWelcomeEmail } from '@/emails/accountCreatedTemplate';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/users/[id]/send-welcome — renvoie le mail de bienvenue (permission « gerer_utilisateurs »).
// Le mot de passe est stocké chiffré : on ne peut pas le « renvoyer », on en génère donc un NOUVEAU
// (l'ancien cesse de marcher) qui est écrit dans le mail. Réponse : { emailSent, emailError?, password } —
// le mot de passe est aussi renvoyé pour pouvoir le transmettre à la main (WhatsApp) si le mail n'est pas parti.
export async function POST(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, customRole: { select: { name: true } } },
    });
    if (!user || !user.email) return NextResponse.json({ error: 'Utilisateur ou adresse e-mail introuvable' }, { status: 404 });
    // Anti-escalade (comme PATCH /api/users/[id]) : seul un ADMIN touche au mot de passe d'un compte administrateur
    if (session.user.role !== 'ADMIN' && user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Seul un administrateur peut modifier un compte administrateur.' }, { status: 403 });
    }

    const password = genPassword();
    await prisma.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(password, 10),
        resetRequested: false,
        resetRequestedAt: null,
        // un éventuel code de connexion en cours devient caduc
        twoFactorCode: null, twoFactorExpires: null, twoFactorAttempts: 0,
      },
    });

    const mail = renderWelcomeEmail({
      name: user.name,
      email: user.email.trim().toLowerCase(),
      password,
      role: user.role,
      roleName: user.customRole?.name ?? null,
    });
    // await : sur Vercel, un envoi non attendu peut ne jamais partir (fonction gelée à la réponse)
    const result = await sendEmail({ to: user.email.trim(), subject: mail.subject, html: mail.html, attachments: [logoAttachment] });
    if (!result.success) console.error('[send-welcome] E-mail non envoyé à', user.email, result.error);

    createAudit({ userId: session.user.id, action: 'Mail de bienvenue renvoyé (nouveau mot de passe)', entity: 'UTILISATEUR', entityId: id, detail: user.name });
    return NextResponse.json({ emailSent: result.success, emailError: result.success ? undefined : result.error, password });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Échec de l\'envoi' }, { status: 500 });
  }
}
