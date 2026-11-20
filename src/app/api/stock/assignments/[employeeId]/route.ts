import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

type Ctx = { params: Promise<{ employeeId: string }> };

// GET /api/stock/assignments/[employeeId] — détail du stock attribué à un employé
export async function GET(_request: Request, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { employeeId } = await params;
  // Le stock d'un commercial n'est visible que par lui-même et par ceux qui gèrent le stock.
  const user = session.user as never;
  if (employeeId !== session.user.id && !hasPermission(user, 'voir_stock_commercial') && !hasPermission(user, 'voir_stock')) {
    return NextResponse.json({ error: "Vous n'avez pas la permission pour cette action" }, { status: 403 });
  }

  try {
    const employee = await prisma.user.findFirst({ where: { id: employeeId }, select: { id: true, name: true } });
    if (!employee) return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });

    const assignments = await prisma.stockAssignment.findMany({
      where: { employeeId },
      include: { product: { select: { reference: true, name: true, available: true } } },
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json({
      id: employee.id,
      name: employee.name,
      lines: assignments.map((a) => ({
        assignmentId: a.id,
        productId: a.productId,
        productReference: a.product.reference,
        productName: a.product.name,
        quantity: a.quantity,
        remainingStock: a.product.available,
        assignedAt: a.assignedAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch assignment detail' }, { status: 500 });
  }
}
