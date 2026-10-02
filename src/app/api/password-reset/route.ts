import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email/send';
import { logoAttachment } from '@/emails/shared';
import { renderPasswordResetRequestEmail } from '@/emails/passwordResetTemplate';
import { renderPasswordResetSelfEmail } from '@/emails/passwordResetSelfTemplate';
import { genPassword } from '@/lib/gen-password';
import bcrypt from 'bcryptjs';
import { validateEmail } from '@/lib/validation';
import { isOwnerEmail } from '@/lib/owner';

// POST /api/password-reset — un utilisateur demande la réinitialisation de son mot de passe (PUBLIC).
// Body : { email }.
//
// AUTOMATIQUE : un nouveau mot de passe est généré et envoyé DIRECTEMENT à l'utilisateur.
// Aucun admin n'a besoin d'agir — ils sont seulement informés (notif + email).
// Réponse volontairement neutre (ne révèle pas si l'email existe).
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'password-reset', 5, 300_000); // 5 / 5 min / IP
  if (limited) return limited;
  try {
    const { email } = await request.json();
    const clean = String(email ?? '').trim().toLowerCase();
    if (validateEmail(clean, true)) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { email: { equals: clean, mode: 'insensitive' }, active: true } });

    // On répond toujours "ok" pour ne pas révéler l'existence du compte
    if (user) {
      // 1. Génère et applique le nouveau mot de passe
      const newPassword = genPassword();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: await bcrypt.hash(newPassword, 10),
          resetRequested: false,
          resetRequestedAt: new Date(),
        },
      });

      // ⚠️ Tout est ATTENDU avant de répondre : sur Vercel (serverless) la fonction est gelée dès que la
      // réponse part, et un e-mail lancé « en tâche de fond » (sans await) pouvait ne JAMAIS partir —
      // le mot de passe était changé mais l'utilisateur ne recevait rien.
      const self = renderPasswordResetSelfEmail({ name: user.name, email: user.email, password: newPassword });
      const resultats = await Promise.allSettled([
        // 2. Envoie le nouveau mot de passe À L'UTILISATEUR
        sendEmail({ to: user.email, subject: self.subject, html: self.html, attachments: [logoAttachment] }),

        // 3. Informe les admins (traçabilité) — SANS le mot de passe
        createNotif({
          type: 'ACTION_AUTRE',
          title: 'Mot de passe réinitialisé',
          message: `${user.name} (${user.email}) a demandé un nouveau mot de passe — envoyé automatiquement par email.`,
          adminOnly: true,
          link: '/admin/settings/users',
        }),

        prisma.user
          .findMany({ where: { role: 'ADMIN', active: true }, select: { email: true } })
          .then((admins) => {
            const mail = renderPasswordResetRequestEmail({ name: user.name, email: user.email });
            // Alerte e-mail réservée à la propriétaire du compte (les autres admins ont la notif dans l'admin)
            return Promise.all(
              admins
                .filter((a) => isOwnerEmail(a.email))
                .map((a) =>
                  sendEmail({ to: a.email!, subject: mail.subject, html: mail.html, attachments: [logoAttachment] }),
                ),
            );
          }),
      ]);
      // sendEmail ne lève pas d'exception : il renvoie { success:false } — on le journalise pour le voir dans les logs Vercel
      const envoiUser = resultats[0];
      if (envoiUser.status === 'rejected' || (envoiUser.status === 'fulfilled' && !envoiUser.value.success)) {
        console.error('[password-reset] E-mail du nouveau mot de passe NON envoyé à', user.email, envoiUser);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Échec de la demande' }, { status: 500 });
  }
}
