import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardDocs } from '@/lib/documents/guard';
import { DocError, deleteDocument, qrForDocument, toRenderable, updateDocument } from '@/lib/documents/service';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/documents/[id] — document complet prêt à dessiner ({ doc: RenderableDocument, meta }).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const row = await prisma.document.findUnique({ where: { id }, include: { invoice: { select: { id: true, number: true } }, bls: { select: { id: true, number: true } } } });
  if (!row) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  const guard = await guardDocs(row.type);
  if (guard.error) return guard.error;
  const qr = await qrForDocument(row);
  return NextResponse.json({
    doc: toRenderable(row, qr),
    meta: { id: row.id, type: row.type, number: row.number, year: row.year, clientId: row.clientId, orderId: row.orderId, quoteId: row.quoteId, shareToken: row.shareToken, invoice: row.invoice, bls: row.bls, createdAt: row.createdAt, updatedAt: row.updatedAt },
  });
}

// PATCH /api/documents/[id] — ADMIN : modifier numéro / contenu / champs ajoutés (historisé).
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await guardDocs('ADMIN');
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    const body = await request.json();
    const doc = await updateDocument(id, { number: body.number, data: body.data, customFields: body.customFields }, guard.user!.id);
    return NextResponse.json({ id: doc.id, number: doc.number });
  } catch (e) {
    if (e instanceof DocError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[documents PATCH]', e);
    return NextResponse.json({ error: 'Modification impossible' }, { status: 500 });
  }
}

// DELETE /api/documents/[id] — ADMIN. Un BL déjà facturé ne peut pas être supprimé.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const guard = await guardDocs('ADMIN');
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    await deleteDocument(id, guard.user!.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DocError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[documents DELETE]', e);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }
}
