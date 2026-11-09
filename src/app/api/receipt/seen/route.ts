import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

// POST /api/receipt/seen — un membre de l'équipe coche « Vu » après la confirmation du client (QR).
// Double confirmation NON bloquante : le statut Livré est déjà passé, ceci ne fait que marquer « pris en compte ».
// Body : { kind: 'order' | 'quote', id }
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { kind, id } = await request.json();
    if ((kind !== 'order' && kind !== 'quote') || typeof id !== 'string') return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

    const where = { id, receiptConfirmedAt: { not: null }, receiptSeenAt: null };
    const data = { receiptSeenAt: new Date() };
    const res = kind === 'order' ? await prisma.order.updateMany({ where, data }) : await prisma.quote.updateMany({ where, data });

    if (res.count > 0) {
      const row = kind === 'order'
        ? await prisma.order.findUnique({ where: { id }, select: { ref: true } })
        : await prisma.quote.findUnique({ where: { id }, select: { ref: true } });
      createAudit({
        userId: session.user.id,
        action: 'Réception client (QR) vue par l\'équipe',
        entity: kind === 'order' ? 'COMMANDE' : 'DEVIS',
        entityId: id,
        detail: row?.ref ?? null,
        ...(kind === 'order' ? { orderId: id } : { quoteId: id }),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[receipt/seen]', e);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
