import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

const PRODUCT_FIELDS = ['available', 'reserved', 'inDelivery', 'returned'] as const;
const MATERIAL_FIELDS = ['available', 'reserved'] as const;

const FIELD_LABELS: Record<string, string> = {
  available: 'Disponible', reserved: 'Réservé', inDelivery: 'En livraison', returned: 'En retour',
};

// POST /api/stock/correction — fixe directement un champ de statut (Disponible / Réservé /
// En livraison / Retour pour un produit ; Disponible / Réservé pour une matière première) à
// une valeur exacte. Aucun effet en cascade — ajustement isolé, indépendant des autres champs.
// body: { type: 'product' | 'material', id: string, field: string, quantity: number }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const qty = Number(body.quantity);
    if (Number.isNaN(qty) || qty < 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });

    if (body.type === 'product') {
      if (!PRODUCT_FIELDS.includes(body.field)) return NextResponse.json({ error: 'Champ invalide' }, { status: 400 });
      const product = await prisma.product.update({ where: { id: body.id }, data: { [body.field]: qty } });
      createAudit({ userId: session?.user?.id, action: `Correction stock produit — ${FIELD_LABELS[body.field]}`, entity: 'STOCK', entityId: product.id, detail: `${product.name ?? product.reference} → ${qty}` });
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'material') {
      if (!MATERIAL_FIELDS.includes(body.field)) return NextResponse.json({ error: 'Champ invalide' }, { status: 400 });
      const material = await prisma.rawMaterial.update({ where: { id: body.id }, data: { [body.field]: qty } });
      createAudit({ userId: session?.user?.id, action: `Correction stock matière — ${FIELD_LABELS[body.field]}`, entity: 'MATIERE', entityId: material.id, detail: `${material.name} → ${qty}` });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Type invalide ('product' | 'material')" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to correct stock' }, { status: 500 });
  }
}
