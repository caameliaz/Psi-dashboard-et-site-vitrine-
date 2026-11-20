import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyPermission } from '@/lib/access';
import { createAudit } from '@/lib/audit';

// POST /api/free-text-recipes/rename — renomme une référence LIBRE (son libellé EST son identité : c'est le texte tapé
// sur les lignes de commande/devis). Le nouveau texte est appliqué PARTOUT : lignes de commandes et de devis,
// ligne de stock/recette (FreeTextRecipe), lignes de la liste de production, notes. Sert aussi à ajouter/corriger le
// métrage entre parenthèses (ex. « 57/69 (60 m) »).
// body: { from: string, to: string }
export async function POST(request: NextRequest) {
  const guard = await requireAnyPermission(['modifier_stock', 'modifier_produits']);
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();
    const from = String(body.from ?? '').trim();
    const to = String(body.to ?? '').trim();
    if (!from || !to) return NextResponse.json({ error: 'Référence manquante' }, { status: 400 });
    if (to.length > 120) return NextResponse.json({ error: 'Référence trop longue (120 caractères max)' }, { status: 400 });
    if (to === from) return NextResponse.json({ ok: true, label: to });

    // Pas de collision : ni avec une autre réf libre qui a déjà sa ligne de stock/recette, ni avec un produit du catalogue
    const [autreLigne, produit] = await Promise.all([
      prisma.freeTextRecipe.findUnique({ where: { label: to }, select: { id: true } }),
      prisma.product.findFirst({ where: { reference: to }, select: { id: true } }),
    ]);
    if (autreLigne) return NextResponse.json({ error: `La référence libre « ${to} » existe déjà` }, { status: 409 });
    if (produit) return NextResponse.json({ error: `« ${to} » est déjà un produit du catalogue` }, { status: 409 });

    const [commandes, devis] = await prisma.$transaction([
      prisma.orderItem.updateMany({ where: { productId: null, description: from }, data: { description: to } }),
      prisma.quoteItem.updateMany({ where: { productId: null, description: from }, data: { description: to } }),
      prisma.freeTextRecipe.updateMany({ where: { label: from }, data: { label: to } }),
      prisma.productionListItem.updateMany({ where: { productId: null, description: from }, data: { description: to } }),
    ]);
    // Notes (table créée par une migration récente : on ignore son absence)
    await prisma.stockNote.updateMany({ where: { kind: 'FREE', refKey: from }, data: { refKey: to } }).catch(() => {});

    createAudit({ userId: session.user.id, action: 'Référence libre renommée', entity: 'STOCK', entityId: to, detail: `« ${from} » → « ${to} » (${commandes.count} ligne(s) de commande, ${devis.count} de devis)` });
    return NextResponse.json({ ok: true, label: to });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to rename free ref' }, { status: 500 });
  }
}
