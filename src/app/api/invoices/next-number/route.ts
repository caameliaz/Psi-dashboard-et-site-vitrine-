import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET /api/invoices/next-number — génère le prochain numéro de facture
// Format : F{ANNÉE}-{SÉQUENCE} ex: F2026-001, F2026-002...
export async function GET() {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  try {
    const year = new Date().getFullYear();
    const prefix = `F${year}-`;

    // Cherche le dernier numéro de facture de l'année en cours
    const [lastOrder, lastQuote] = await Promise.all([
      prisma.order.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      }),
      prisma.quote.findFirst({
        where: { invoiceNumber: { startsWith: prefix } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
      }),
    ]);

    // Extrait le numéro de séquence le plus élevé
    const lastOrderNum = lastOrder?.invoiceNumber ? parseInt(lastOrder.invoiceNumber.replace(prefix, '')) : 0;
    const lastQuoteNum = lastQuote?.invoiceNumber ? parseInt(lastQuote.invoiceNumber.replace(prefix, '')) : 0;
    const maxNum = Math.max(lastOrderNum, lastQuoteNum);

    // Prochain numéro : incrément de 1, formaté sur 3 chiffres
    const nextNum = maxNum + 1;
    const nextNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

    return NextResponse.json({ nextNumber });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to generate invoice number' }, { status: 500 });
  }
}
