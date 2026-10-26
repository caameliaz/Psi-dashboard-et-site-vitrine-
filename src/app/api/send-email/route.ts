import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { sendEmail } from '@/lib/email/send';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/send-email — envoie un email au nom de l'entreprise (expéditeur fixe côté serveur)
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'send-email', 20, 60_000); // 20 envois / min / IP
  if (limited) return limited;
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: 'Champs requis manquants (to, subject, html/text)' }, { status: 400 });
    }

    // Garde-fous anti-abus (le compte d'un commercial ne doit pas servir de relais d'envoi libre
    // depuis l'adresse de l'entreprise) : UN seul destinataire valide, sujet sans saut de ligne
    // (injection d'en-têtes), taille bornée.
    const emailOk = typeof to === 'string' && /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to.trim());
    if (!emailOk) return NextResponse.json({ error: 'Adresse du destinataire invalide (une seule adresse)' }, { status: 400 });
    if (typeof subject !== 'string' || /[\r\n]/.test(subject) || subject.length > 200) {
      return NextResponse.json({ error: 'Objet invalide' }, { status: 400 });
    }
    if (String(html ?? '').length > 50_000 || String(text ?? '').length > 50_000) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 });
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
