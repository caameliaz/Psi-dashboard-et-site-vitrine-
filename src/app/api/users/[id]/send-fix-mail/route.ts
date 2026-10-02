import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { isOwnerEmail } from '@/lib/owner';
import { genPassword } from '@/lib/gen-password';
import { sendEmail } from '@/lib/email/send';
import { logoAttachment } from '@/emails/shared';
import { renderLoginFixEmail } from '@/emails/loginFixTemplate';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/users/[id]/send-fix-mail — RÉSERVÉ à la propriétaire du compte (cf. lib/owner.ts).
// Génère un NOUVEAU mot de passe pour l'utilisateur, l'applique et lui envoie l'e-mail « erreur résolue »
// (le mot de passe actuel est chiffré : on ne peut pas le « renvoyer », seulement en créer un nouveau).
// Réponse : { emailSent, emailError?, password } — le mot de passe est renvoyé pour pouvoir le transmettre
// à la main (WhatsApp) si l'e-mail n'a pas pu partir.
export async function POST(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (!isOwnerEmail(session.user.email)) {
    return NextResponse.json({ error: 'Action réservée à la propriétaire du compte.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, active: true } });
    if (!user || !user.email) return NextResponse.json({ error: 'Utilisateur ou adresse e-mail introuvable' }, { status: 404 });

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

    const mail = renderLoginFixEmail({ name: user.name, email: user.email.trim().toLowerCase(), password });
    // await : sur Vercel, un envoi non attendu peut ne jamais partir (fonction gelée à la réponse)
    const result = await sendEmail({ to: user.email.trim(), subject: mail.subject, html: mail.html, attachments: [logoAttachment] });
    if (!result.success) console.error('[send-fix-mail] E-mail non envoyé à', user.email, result.error);

    createAudit({ userId: session.user.id, action: 'Mot de passe renvoyé (erreur de connexion résolue)', entity: 'UTILISATEUR', entityId: id, detail: user.name });
    return NextResponse.json({ emailSent: result.success, emailError: result.success ? undefined : result.error, password });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Échec de l\'envoi' }, { status: 500 });
  }
}
