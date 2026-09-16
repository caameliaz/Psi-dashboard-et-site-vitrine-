import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { saveProductRecipe } from '@/lib/order-stock';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/products/[id]/recipe — remplace entièrement la recette d'un produit
// body: { items: [{ rawMaterialId: string, quantity: number }] }
export async function PUT(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();
    const items: { rawMaterialId: string; quantity: number }[] = Array.isArray(body.items) ? body.items : [];

    for (const item of items) {
      if (!item.rawMaterialId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ error: 'Chaque ligne de recette doit avoir une matière première et une quantité valide' }, { status: 400 });
      }
    }

    const product = await prisma.product.findUnique({ where: { id }, select: { name: true, reference: true } });
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 });

    // Réconciliation GLOBALE (Bloquées ET déjà "À produire", tous produits confondus) de chaque
    // matière touchée — ancienne (pour remettre à 0 la part due à CE produit si elle en a été
    // retirée) et nouvelle (pour la demande à jour, avec les nouveaux ratios). Recalcule
    // `reserved`/`available` à neuf et le statut de chaque ligne concernée, y compris
    // rétrograder une ligne "À produire" plus récente si une plus ancienne devient prioritaire
    // — volontairement plus agressif qu'une réception de stock ou "Marquer fabriquée" (cf.
    // reconcileMaterialAcrossAllLines) : un changement de recette redéfinit légitimement les
    // priorités, contrairement à ces deux-là qui ne retouchent jamais du `reserved` déjà acquis.
    const recipeItems = await saveProductRecipe(id, items);

    // "Commandes concernées" (badge Bloqué par commande) : rien à faire de plus, il est déjà
    // recalculé EN DIRECT à chaque lecture à partir de `reserved` (jamais stocké) — cf.
    // stock-traceability.ts.

    const prodLabel = product.name ? `${product.name} (${product.reference})` : product.reference;
    createAudit({ userId: session?.user?.id, action: 'Recette modifiée', entity: 'PRODUIT', entityId: id, detail: prodLabel });
    return NextResponse.json(recipeItems);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}
