import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { resyncProductionLine, resyncPurchaseLineForProduct, resyncMaterialBufferOnly, resyncMaterialPurchaseNeed, reallocateAvailableStock, unblockProductionForMaterial } from '@/lib/order-stock';

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
      const before = body.field === 'available' ? await prisma.product.findUnique({ where: { id: body.id }, select: { available: true } }) : null;
      const product = await prisma.product.update({ where: { id: body.id }, data: { [body.field]: qty } });
      createAudit({ userId: session?.user?.id, action: `Correction stock produit — ${FIELD_LABELS[body.field]}`, entity: 'STOCK', entityId: product.id, detail: `${product.name ?? product.reference} → ${qty}` });
      // `available` est le seul champ qui influe sur la cible du rattrapage préventif —
      // recalcul immédiat, mais uniquement sur CE produit (pas de balayage global).
      if (body.field === 'available') {
        if (before && qty > before.available) {
          // Le disponible vient d'AUGMENTER → proposer ce stock EN PRIORITÉ aux autres
          // commandes/devis déjà en attente sur ce produit (FIFO), avant de laisser le
          // reliquat compter comme simple buffer — même logique que la réception en liste
          // d'achat ou l'annulation d'une commande. Recalcule aussi le buffer à la fin.
          await reallocateAvailableStock(product.id);
        } else {
          await resyncProductionLine(product.id);
          await resyncPurchaseLineForProduct(product.id);
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'material') {
      if (!MATERIAL_FIELDS.includes(body.field)) return NextResponse.json({ error: 'Champ invalide' }, { status: 400 });
      const before = body.field === 'available' ? await prisma.rawMaterial.findUnique({ where: { id: body.id }, select: { available: true } }) : null;
      const material = await prisma.rawMaterial.update({ where: { id: body.id }, data: { [body.field]: qty } });
      createAudit({ userId: session?.user?.id, action: `Correction stock matière — ${FIELD_LABELS[body.field]}`, entity: 'MATIERE', entityId: material.id, detail: `${material.name} → ${qty}` });
      if (body.field === 'available') {
        if (before && qty > before.available) {
          // Débloque d'abord les lignes de production "Bloquées" qui attendaient cette
          // matière, avant de recalculer son propre buffer sur ce qui reste.
          await unblockProductionForMaterial(material.id);
        }
        await resyncMaterialBufferOnly(material.id);
      } else if (body.field === 'reserved') {
        // `reserved` fait partie de la formule du besoin réel (besoin réel = demande −
        // reserved) — contrairement au produit, le corriger doit recalculer le besoin de
        // cette matière (pas seulement le buffer, qui lui n'en dépend pas).
        await resyncMaterialPurchaseNeed(material.id);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Type invalide ('product' | 'material')" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to correct stock' }, { status: 500 });
  }
}
