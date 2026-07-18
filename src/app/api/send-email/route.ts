import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { sendEmail } from '@/lib/email/send';

// POST /api/send-email — envoie un email au nom de l'entreprise (expéditeur fixe côté serveur)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Champs requis manquants (to, subject, html/text)' }, { status: 400 });
    }

    const result = await sendEmail({ to, subject, html, text });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/send-email] ERROR:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
