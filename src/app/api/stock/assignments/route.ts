import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// GET /api/stock/assignments — liste des employés actifs avec le total de stock attribué
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [employees, groups] = await Promise.all([
      prisma.user.findMany({ where: { role: 'EMPLOYEE', active: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.stockAssignment.groupBy({ by: ['employeeId'], _sum: { quantity: true } }),
    ]);
    const totals = new Map(groups.map((g) => [g.employeeId, g._sum.quantity ?? 0]));
    return NextResponse.json(employees.map((e) => ({ id: e.id, name: e.name, totalAssigned: totals.get(e.id) ?? 0 })));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

// POST /api/stock/assignments — attribue du stock produit à un employé (permission modifier_stock)
// body: { employeeId: string, lines: [{ productId: string, quantity: number }] }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const lines: { productId: string; quantity: number }[] = Array.isArray(body.lines) ? body.lines : [];
    if (!body.employeeId) return NextResponse.json({ error: 'Employé requis' }, { status: 400 });
    if (lines.length === 0) return NextResponse.json({ error: 'Sélectionne au moins un produit' }, { status: 400 });

    const employee = await prisma.user.findFirst({ where: { id: body.employeeId, role: 'EMPLOYEE' } });
    if (!employee) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });

    // `available`/`reserved` ne sont PLUS touchés par l'attribution (décision produit) : le
    // contrôle de disponibilité porte sur le stock "hors commerciaux" (available + reserved −
    // Σ attributions, MÊME formule que /api/stock/products), jamais sur `available` seul —
    // sinon on pourrait attribuer plusieurs fois le même stock à des commerciaux différents.
    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });

      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

      const alreadyAssigned = await prisma.stockAssignment.aggregate({ where: { productId: product.id }, _sum: { quantity: true } });
      const freeStock = product.available + product.reserved - (alreadyAssigned._sum.quantity ?? 0);
      if (freeStock < qty) {
        const missing = qty - Math.max(0, freeStock);
        return NextResponse.json({ error: `Stock hors commerciaux insuffisant pour ${product.reference} : ${Math.max(0, freeStock)} disponible, ${missing} manquant(s)` }, { status: 409 });
      }

      const existing = await prisma.stockAssignment.findFirst({ where: { employeeId: employee.id, productId: product.id } });
      await (existing
        ? prisma.stockAssignment.update({ where: { id: existing.id }, data: { quantity: { increment: qty }, assignedAt: new Date() } })
        : prisma.stockAssignment.create({ data: { employeeId: employee.id, productId: product.id, quantity: qty } }));
    }

    createAudit({ userId: session?.user?.id, action: 'Stock attribué', entity: 'STOCK', entityId: employee.id, detail: `${employee.name} — ${lines.length} ligne(s)` });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
