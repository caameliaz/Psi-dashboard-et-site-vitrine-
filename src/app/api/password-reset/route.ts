import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotif } from '@/lib/notifications';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/password-reset — un utilisateur demande la réinitialisation de son mot de passe (PUBLIC).
// Body : { email }. Marque le compte "reset demandé" + notifie les admins (in-app).
// Réponse volontairement neutre (ne révèle pas si l'email existe).
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'password-reset', 5, 300_000); // 5 / 5 min / IP
  if (limited) return limited;
  try {
    const { email } = await request.json();
    const clean = String(email ?? '').trim().toLowerCase();
    if (!clean) return NextResponse.json({ error: 'Email requis' }, { status: 400 });

    const user = await prisma.user.findFirst({ where: { email: { equals: clean, mode: 'insensitive' }, active: true } });

    // On répond toujours "ok" pour ne pas révéler l'existence du compte
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { resetRequested: true, resetRequestedAt: new Date() },
      });
      createNotif({
        type: 'ACTION_AUTRE',
        title: 'Mot de passe oublié',
        message: `${user.name} (${user.email}) a demandé une réinitialisation de son mot de passe.`,
        adminOnly: true,
        link: '/admin/users',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Échec de la demande' }, { status: 500 });
  }
}
