import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { distributeProduction, resyncProductionLine, reassessProductionForMaterial } from '@/lib/order-stock';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/production-list/[id] — "Marquer fabriquée"
// body: { quantity: number }
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();
    const qty = Number(body.quantity);
    if (!qty || qty <= 0) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 });

    const item = await prisma.productionListItem.findUnique({ where: { id }, include: { product: true } });
    if (!item) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 });

    // Consomme définitivement les matières premières pour la quantité produite. Vérification
    // globale D'ABORD, sur TOUTES les matières de la recette, avant de toucher quoi que ce
    // soit : si une seule matière n'a physiquement pas assez de stock (disponible + réservé
    // combinés, tous produits confondus), on arrête tout net, rien n'est modifié.
    const recipe = await prisma.recipeItem.findMany({ where: { productId: item.productId }, include: { rawMaterial: true } });
    for (const r of recipe) {
      const totalNeeded = r.quantity * qty;
      const totalStock = r.rawMaterial.available + r.rawMaterial.reserved;
      if (totalStock < totalNeeded) {
        return NextResponse.json({ error: `Stock matière insuffisant pour produire cette quantité : ${r.rawMaterial.name} (disponible+réservé=${totalStock}, besoin=${totalNeeded})` }, { status: 409 });
      }
    }

    // Consommation, en 3 temps par matière :
    // 1. La part qui correspond au besoin déjà reconnu de CETTE ligne (dans la limite de ce
    //    qu'elle produit) vient d'abord de son propre `reserved` — déjà mis de côté pour elle
    //    depuis la confirmation, on la libère normalement (jamais prise sur le disponible
    //    général, sinon cette réservation resterait bloquée pour toujours, jamais consommée).
    // 2. Le surplus éventuel (au-delà du besoin déjà reconnu — buffer produit, ou quantité
    //    forcée plus grande que prévu) prend d'abord sur le disponible (matière fraîche,
    //    jamais promise à personne).
    // 3. S'il en manque encore, on pioche dans le `reserved` du pot commun — donc
    //    potentiellement dans ce qui était de fait compté pour d'AUTRES lignes "À produire".
    //    Celles-ci seront réévaluées juste après (reassessProductionForMaterial) : les plus
    //    RÉCENTES basculent "Bloquée" en priorité, les plus anciennes gardent leur matière.
    const touchedByReserved = new Set<string>();
    for (const r of recipe) {
      const totalNeeded = r.quantity * qty;
      const ownPortion = r.quantity * Math.min(qty, item.neededQuantity);

      const fromReservedOwn = Math.min(ownPortion, r.rawMaterial.reserved);
      const afterOwn = totalNeeded - fromReservedOwn;
      const fromAvailable = Math.min(afterOwn, r.rawMaterial.available);
      const fromReservedExcess = afterOwn - fromAvailable;

      await prisma.rawMaterial.update({
        where: { id: r.rawMaterialId },
        data: { available: { decrement: fromAvailable }, reserved: { decrement: fromReservedOwn + fromReservedExcess } },
      });
      if (fromReservedExcess > 0) touchedByReserved.add(r.rawMaterialId);
    }

    // `producedQuantity` est un pur compteur historique (jamais dérivé) — on l'incrémente
    // directement. Le besoin/buffer, eux, sont entièrement recalculés ensuite (resyncProductionLine),
    // plus besoin de replier "à la main" ce qui a été produit dans l'un ou l'autre champ.
    await prisma.productionListItem.update({ where: { id }, data: { producedQuantity: { increment: qty } } });

    // Distribue la quantité produite aux commandes/devis liés (→ Réservé, FIFO), le
    // reliquat éventuel (réassort manuel/seuil) part en Disponible.
    await distributeProduction(id, qty, item.productId);

    // Recalcule entièrement à neuf le besoin + le buffer de cette ligne (les commandes
    // viennent d'avancer, le disponible a pu bouger) — marque "Produit" si plus rien ne
    // manque (cf. resyncProductionLine), et recalcule la matière première en cascade.
    await resyncProductionLine(item.productId);

    // Si on vient d'empiéter sur le pot commun `reserved` (pas assez de disponible pour tout
    // couvrir), réévalue les AUTRES lignes "À produire" utilisant cette matière — les plus
    // récentes basculent "Bloquée" si elles ne sont plus couvertes, et la liste d'achat
    // matière se met à jour en conséquence. Fait APRÈS resyncProductionLine ci-dessus pour que
    // la ligne courante compte déjà avec son besoin à jour dans cette réévaluation.
    for (const rawMaterialId of touchedByReserved) await reassessProductionForMaterial(rawMaterialId);

    const updated = await prisma.productionListItem.findUnique({ where: { id } });
    createAudit({ userId: session?.user?.id, action: `Production réalisée (+${qty})`, entity: 'STOCK', entityId: id, detail: item.product.reference });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update production list item' }, { status: 500 });
  }
}

// DELETE /api/production-list/[id] — retirer une ligne de la liste
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_stock');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    await prisma.productionListItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete production list item' }, { status: 500 });
  }
}
