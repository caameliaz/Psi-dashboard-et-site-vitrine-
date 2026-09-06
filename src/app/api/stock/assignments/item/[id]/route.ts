import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/stock/assignments/item/[id] — retire tout ou partie d'une attribution ;
// la quantité retirée redevient disponible dans le stock produit général.
// body: { quantity?: number } — omis = retrait total
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const assignment = await prisma.stockAssignment.findUnique({ where: { id }, include: { product: true, employee: { select: { name: true } } } });
    if (!assignment) return NextResponse.json({ error: 'Attribution introuvable' }, { status: 404 });

    const qty = body.quantity == null ? assignment.quantity : Number(body.quantity);
    if (!qty || qty <= 0 || qty > assignment.quantity) return NextResponse.json({ error: 'Quantité à retirer invalide' }, { status: 400 });

    const remaining = assignment.quantity - qty;

    await prisma.$transaction([
      prisma.product.update({ where: { id: assignment.productId }, data: { available: { increment: qty } } }),
      remaining <= 0
        ? prisma.stockAssignment.delete({ where: { id: assignment.id } })
        : prisma.stockAssignment.update({ where: { id: assignment.id }, data: { quantity: remaining } }),
    ]);

    createAudit({ userId: session?.user?.id, action: `Stock retiré (${qty})`, entity: 'STOCK', entityId: assignment.productId, detail: `${assignment.employee.name} — ${assignment.product.reference}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to withdraw assignment' }, { status: 500 });
  }
}
