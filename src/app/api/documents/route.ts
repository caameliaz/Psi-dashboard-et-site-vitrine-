import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { guardDocs, isKind } from '@/lib/documents/guard';
import { DocError, issueDocument } from '@/lib/documents/service';
import type { DocumentData } from '@/lib/documents/types';

// GET /api/documents?type=&clientId=&orderId=&quoteId=&toInvoice=1&q= — liste (résumé, sans le contenu complet).
// Les non-admins ne voient que les BL.
export async function GET(request: NextRequest) {
  const guard = await guardDocs('BL');
  if (guard.error) return guard.error;
  const isAdmin = guard.user!.isAdmin;
  const sp = request.nextUrl.searchParams;
  const type = sp.get('type');
  try {
    const where: Prisma.DocumentWhereInput = {};
    if (isKind(type)) where.type = type;
    if (!isAdmin) where.type = 'BL';
    if (sp.get('clientId')) where.clientId = sp.get('clientId');
    if (sp.get('orderId')) where.orderId = sp.get('orderId');
    if (sp.get('quoteId')) where.quoteId = sp.get('quoteId');
    if (sp.get('toInvoice') === '1') { where.type = 'BL'; where.invoiceId = null; }
    const q = (sp.get('q') ?? '').trim();
    if (q) where.OR = [{ number: { contains: q, mode: 'insensitive' } }, { client: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { company: { contains: q, mode: 'insensitive' } }] } }];
    const rows = await prisma.document.findMany({
      where, orderBy: [{ year: 'desc' }, { createdAt: 'desc' }], take: 500,
      include: { invoice: { select: { id: true, number: true } }, client: { select: { id: true, name: true, company: true } }, order: { select: { ref: true } }, quote: { select: { ref: true } } },
    });
    const items = rows.map((r) => {
      const d = r.data as unknown as DocumentData;
      return {
        id: r.id, type: r.type, number: r.number, year: r.year, createdAt: r.createdAt, date: d.date,
        clientId: r.clientId, clientName: d.client?.name || r.client?.company || r.client?.name || '', orderId: r.orderId, quoteId: r.quoteId,
        sourceRef: r.order?.ref ?? r.quote?.ref ?? d.orderRef ?? null, invoice: r.invoice, lineCount: d.lines?.length ?? 0,
        quantity: (d.lines ?? []).reduce((s, l) => s + (l.quantity || 0), 0), paymentMethod: d.paymentMethod,
        ...(isAdmin ? { total: d.totals?.net ?? 0 } : {}), blNumbers: d.blNumbers ?? [],
      };
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error('[documents GET]', e);
    return NextResponse.json({ error: 'Impossible de charger les documents' }, { status: 500 });
  }
}

// POST /api/documents — émet un document. Body : { kind, number, data, customFields?, orderId?, quoteId?, clientId?, blIds?, saveClient? }
// `saveClient` = { rc, nif, nis, ai } : infos fiscales saisies dans la fenêtre → enregistrées aussi sur la fiche client.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isKind(body.kind)) return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 });
    const guard = await guardDocs(body.kind);
    if (guard.error) return guard.error;
    if (body.saveClient && body.clientId && guard.user!.isAdmin) {
      const f = body.saveClient as Record<string, unknown>;
      const upd: Record<string, string> = {};
      for (const k of ['rc', 'nif', 'nis', 'ai']) if (typeof f[k] === 'string' && (f[k] as string).trim()) upd[k] = (f[k] as string).trim();
      if (Object.keys(upd).length) await prisma.client.update({ where: { id: body.clientId }, data: upd });
    }
    const doc = await issueDocument({
      kind: body.kind, number: body.number, data: body.data, customFields: body.customFields,
      orderId: body.orderId ?? null, quoteId: body.quoteId ?? null, clientId: body.clientId ?? null, blIds: body.blIds, userId: guard.user!.id,
    });
    return NextResponse.json({ id: doc.id, number: doc.number, type: doc.type, shareToken: doc.shareToken }, { status: 201 });
  } catch (e) {
    if (e instanceof DocError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[documents POST]', e);
    return NextResponse.json({ error: 'Impossible de créer le document' }, { status: 500 });
  }
}
