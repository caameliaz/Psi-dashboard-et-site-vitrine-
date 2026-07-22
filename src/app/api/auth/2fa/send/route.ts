import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { isBlocked, recordFail } from '@/lib/login-guard';
import { sendEmail } from '@/lib/email/send';
import { logoAttachment } from '@/emails/shared';
import { renderTwoFactorCodeEmail } from '@/emails/twoFactorCodeTemplate';
import { validateEmail } from '@/lib/validation';

// POST /api/auth/2fa/send — étape 1 du login : vérifie email+mot de passe,
// puis génère et envoie par email un code à 6 chiffres (valable 5 min).
// L'étape 2 (vérification du code) se fait via NextAuth (authorize).
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'login-2fa-send', 8, 15 * 60_000); // 8 / 15 min / IP
  if (limited) return limited;

  try {
    const { email, password } = await request.json();
    const clean = String(email ?? '').trim().toLowerCase();
    if (validateEmail(clean, true) || !password) {
      return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 400 });
    }

    if (isBlocked('login', clean)) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: clean } });
    if (!user || !user.active) {
      recordFail('login', clean);
      return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(String(password), user.password);
    if (!passwordMatch) {
      recordFail('login', clean);
      return NextResponse.json({ error: 'Identifiant ou mot de passe incorrect.' }, { status: 401 });
    }

    // Identifiants valides → génère un code à 6 chiffres, valable 5 min, usage unique
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorExpires: new Date(Date.now() + 5 * 60_000),
        twoFactorAttempts: 0,
      },
    });

    const mail = renderTwoFactorCodeEmail({ name: user.name, code });
    const result = await sendEmail({ to: user.email, subject: mail.subject, html: mail.html, attachments: [logoAttachment] });
    if (!result.success) {
      console.error('[2fa/send] envoi email échoué:', result.error);
      return NextResponse.json({ error: "Échec de l'envoi du code. Réessayez." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Échec de la demande' }, { status: 500 });
  }
}
