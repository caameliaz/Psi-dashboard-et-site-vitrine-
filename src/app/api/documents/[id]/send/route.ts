import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email/send';
import { SITE_URL } from '@/lib/receipt';
import { guardDocs } from '@/lib/documents/guard';
import { documentExcelBuffer, documentFileName } from '@/lib/documents/excel';
import { DOC_LABEL, toRenderable } from '@/lib/documents/service';
import type { DocumentData } from '@/lib/documents/types';

type Ctx = { params: Promise<{ id: string }> };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

// Texte proposé dans l'aperçu du mail (modifiable avant l'envoi).
function defaults(row: { type: 'BL' | 'FACTURE' | 'PROFORMA'; number: string; shareToken: string; data: unknown; templateSnapshot: unknown; customFields: unknown }, clientEmail: string | null) {
  const d = row.data as unknown as DocumentData;
  const what = row.type === 'BL' ? 'le bon de livraison' : row.type === 'FACTURE' ? 'la facture' : 'la facture proforma';
  return {
    to: clientEmail ?? '',
    subject: `${DOC_LABEL[row.type]} ${row.number} — Paper Solutions Industry`,
    message: `Bonjour,\n\nVeuillez trouver ci-joint ${what} ${row.number}${d.orderRef ? ` (commande ${d.orderRef})` : ''}.\n\nVous pouvez aussi la consulter, l'imprimer ou l'enregistrer en PDF depuis le lien ci-dessous.\n\nCordialement,\nPSI — Paper Solutions Industry`,
    link: `${SITE_URL}/d/${row.shareToken}`,
    attachmentName: documentFileName(toRenderable(row)),
  };
}

// GET — valeurs proposées dans l'aperçu (destinataire = e-mail de la fiche client, objet, texte, lien, pièce jointe).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const guard = await guardDocs('ADMIN');
  if (guard.error) return guard.error;
  const { id } = await params;
  const row = await prisma.document.findUnique({ where: { id }, include: { client: { select: { email: true } } } });
  if (!row) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  return NextResponse.json(defaults(row, row.client?.email ?? null));
}

// POST — envoie le mail (seulement après le clic « Envoyer » de l'aperçu). Body : { to, subject, message, attachExcel }
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await guardDocs('ADMIN');
  if (guard.error) return guard.error;
  const { id } = await params;
  const row = await prisma.document.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  try {
    const body = await request.json();
    const to = String(body.to ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 });
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();
    if (!subject || !message) return NextResponse.json({ error: 'Objet et message obligatoires' }, { status: 400 });
    const link = `${SITE_URL}/d/${row.shareToken}`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.55">
${esc(message).replace(/\n/g, '<br>')}
<p style="margin:18px 0"><a href="${link}" style="background:#4CAF4F;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:8px;display:inline-block">Ouvrir le document</a></p>
<p style="font-size:12px;color:#777">Lien : <a href="${link}">${link}</a></p></div>`;
    const doc = toRenderable(row);
    const attachments = body.attachExcel === false ? undefined : [{ filename: documentFileName(doc), content: Buffer.from(documentExcelBuffer(doc)) }];
    const res = await sendEmail({ to, subject, html, text: `${message}\n\n${link}`, attachments });
    if (!res.success) return NextResponse.json({ error: `Envoi impossible : ${res.error}` }, { status: 502 });
    createAudit({ userId: guard.user!.id, action: `${DOC_LABEL[row.type]} envoyé${row.type === 'BL' ? '' : 'e'} par e-mail`, entity: 'DOCUMENT', entityId: id, orderId: row.orderId, quoteId: row.quoteId, detail: `${row.number} → ${to}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[documents/send]', e);
    return NextResponse.json({ error: 'Envoi impossible' }, { status: 500 });
  }
}
