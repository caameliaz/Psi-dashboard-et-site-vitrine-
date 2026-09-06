import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// POST /api/stock/restock — augmente le stock d'un produit ou d'une matière première.
// Pour un produit fabriqué (mode FABRIQUE ou LES_DEUX avec mode:'produire'), décrémente
// automatiquement les matières premières de sa recette (recette au niveau global).
// body: { type: 'product' | 'material', id: string, quantity: number, mode?: 'produire' | 'acheter' }
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });

    if (body.type === 'product') {
      const product = await prisma.product.findUnique({
        where: { id: body.id },
        include: { recipeItems: true },
      });
      if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

      let effectiveMode: 'produire' | 'acheter';
      if (product.mode === 'LES_DEUX') {
        if (body.mode !== 'produire' && body.mode !== 'acheter') {
          return NextResponse.json({ error: "Ce produit est acheté ET fabriqué : précise le mode ('produire' | 'acheter')" }, { status: 400 });
        }
        effectiveMode = body.mode;
      } else {
        effectiveMode = product.mode === 'FABRIQUE' ? 'produire' : 'acheter';
      }

      if (effectiveMode === 'produire' && product.recipeItems.length > 0) {
        // Vérifie qu'il y a assez de matières premières avant de produire
        const materials = await prisma.rawMaterial.findMany({ where: { id: { in: product.recipeItems.map((r) => r.rawMaterialId) } } });
        for (const item of product.recipeItems) {
          const mat = materials.find((m) => m.id === item.rawMaterialId);
          if (!mat || mat.available < item.quantity * qty) {
            return NextResponse.json({ error: `Stock insuffisant en matière première : ${mat?.name ?? item.rawMaterialId}` }, { status: 409 });
          }
        }
        await prisma.$transaction([
          prisma.product.update({ where: { id: product.id }, data: { available: { increment: qty } } }),
          ...product.recipeItems.map((item) =>
            prisma.rawMaterial.update({ where: { id: item.rawMaterialId }, data: { available: { decrement: item.quantity * qty } } })
          ),
        ]);
      } else {
        await prisma.product.update({ where: { id: product.id }, data: { available: { increment: qty } } });
      }

      createAudit({ userId: session?.user?.id, action: `Stock produit approvisionné (+${qty})`, entity: 'STOCK', entityId: product.id, detail: `${product.name ?? product.reference} — ${effectiveMode}` });
      return NextResponse.json({ ok: true, mode: effectiveMode });
    }

    if (body.type === 'material') {
      const material = await prisma.rawMaterial.findUnique({ where: { id: body.id } });
      if (!material) return NextResponse.json({ error: 'Matière première introuvable' }, { status: 404 });

      await prisma.rawMaterial.update({ where: { id: material.id }, data: { available: { increment: qty } } });
      createAudit({ userId: session?.user?.id, action: `Stock matière approvisionné (+${qty})`, entity: 'MATIERE', entityId: material.id, detail: `${material.name} (${material.reference})` });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Type invalide ('product' | 'material')" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to restock' }, { status: 500 });
  }
}
