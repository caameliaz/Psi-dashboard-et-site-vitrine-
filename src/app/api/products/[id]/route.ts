import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAudit } from '@/lib/audit';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/products/[id] — modifier un produit (admin)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.reference !== undefined && { reference: body.reference }),
        ...(body.width !== undefined && { width: Number(body.width) }),
        ...(body.length !== undefined && { length: Number(body.length) }),
        ...(body.usage !== undefined && { usage: body.usage }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.photo !== undefined && { photo: body.photo }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      },
      include: { category: true, customFields: { include: { definition: true } } },
    });

    const action = body.active !== undefined && !body.reference
      ? `Produit ${body.active ? 'activé' : 'désactivé'}`
      : 'Produit modifié';
    createAudit({ userId: session?.user?.id, action, entity: 'PRODUIT', entityId: id, detail: product.reference });
    return NextResponse.json(product);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/[id] — supprimer un produit (admin)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { reference: true } });
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    // Blocage si le produit est utilisé dans des commandes/devis (préserve l'historique)
    const [inOrders, inQuotes] = await Promise.all([
      prisma.orderItem.count({ where: { productId: id } }),
      prisma.quoteItem.count({ where: { productId: id } }),
    ]);
    if (inOrders + inQuotes > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ce produit est utilisé dans ${inOrders + inQuotes} commande(s)/devis. Désactivez-le plutôt.` },
        { status: 409 }
      );
    }

    await prisma.product.delete({ where: { id } });
    createAudit({ userId: session?.user?.id, action: 'Produit supprimé', entity: 'PRODUIT', entityId: id, detail: product.reference });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
