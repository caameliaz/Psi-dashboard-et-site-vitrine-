import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import {
  distributeProduction, resyncProductionLine, resyncFreeTextProductionLine, reassessProductionForMaterial,
  saveProductRecipe, saveFreeTextRecipe, getFreeTextRecipe, checkAndConsumeRecipe, checkCompletion, type RecipeOverrideItem,
} from '@/lib/order-stock';
import { createLinkResolver } from '@/lib/stock-traceability';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/production-list/[id] — détail d'UNE ligne + "commandes concernées" (qui retient du
// stock/de la matière sur ce produit) — utilisé par le panneau commande/devis pour expliquer
// "État du stock — pas encore disponible" (cf. RequestPanel.tsx).
export async function GET(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('voir_stock');
  if (guard.error) return guard.error;

  const { id } = await params;

  try {
    const item = await prisma.productionListItem.findUnique({
      where: { id },
      include: { product: { select: { id: true, reference: true, name: true, mode: true, available: true, reserved: true, productionThreshold: true } } },
    });
    if (!item) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 });

    const resolver = createLinkResolver();
    const links = item.productId ? await resolver.productionLineLinks(item.productId, item.id) : await resolver.freeTextLineLinks(item.id);
    // "Qui retient du stock actuellement" (toutes commandes Confirmée/Produite avec du réservé,
    // pas juste celles en attente/bloquées) — cf. RequestPanel.tsx, différent de "links" ci-dessus.
    const holders = item.productId ? await resolver.productStockHolders(item.productId) : { orderItems: [], quoteItems: [] };

    return NextResponse.json({ ...item, ...links, holders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch production list item' }, { status: 500 });
  }
}

// Résout une recette ad-hoc (jamais persistée) en tableau exploitable par checkAndConsumeRecipe.
async function materializeOverride(override: RecipeOverrideItem[]) {
  const materials = await prisma.rawMaterial.findMany({ where: { id: { in: override.map((o) => o.rawMaterialId) } } });
  const mapped = override.map((o) => {
    const rawMaterial = materials.find((m) => m.id === o.rawMaterialId);
    return rawMaterial ? { rawMaterialId: o.rawMaterialId, quantity: Number(o.quantity), rawMaterial } : null;
  });
  return mapped.filter((r): r is NonNullable<typeof r> => r !== null);
}

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

    // Étiquette d'affichage : la référence du produit, ou le texte tapé à la main pour une
    // ligne LIBRE (jamais de fiche produit pour elle, cf. schema.prisma ProductionListItem).
    const label = item.product ? item.product.reference : (item.description ?? 'Ligne libre');

    // Recette : celle du produit si elle existe ; sinon, pour une ligne LIBRE, celle déjà
    // enregistrée sous ce texte EXACT le cas échéant (cf. saveFreeTextRecipe/getFreeTextRecipe —
    // appliquée automatiquement, sans jamais redemander, comme une vraie recette de produit).
    let recipe = item.productId
      ? await prisma.recipeItem.findMany({ where: { productId: item.productId }, include: { rawMaterial: true } })
      : await getFreeTextRecipe(item.description);

    // Toujours aucune recette (produit sans recette définie, OU ligne libre jamais enregistrée)
    // → au lieu de produire en silence sans jamais vérifier/consommer de matière (ancien
    // comportement), on demande explicitement à l'utilisateur quoi faire (cf. NoRecipeModal.tsx) :
    // - `recipeOverride` : une recette saisie à la volée pour CETTE production seulement,
    //   éventuellement sauvegardée si `saveRecipe` est vrai — sur le produit (saveProductRecipe)
    //   ou, pour une ligne libre, sous son texte exact (saveFreeTextRecipe, réutilisée
    //   automatiquement la prochaine fois qu'une ligne libre porte ce même texte).
    // - `allowNoRecipe` : continuer sans recette, comportement identique à avant (aucune
    //   vérification/consommation), mais choisi explicitement plutôt que silencieux.
    // - ni l'un ni l'autre → blocage net avec un code d'erreur dédié, pas un simple avertissement.
    let noRecipeWarning: string | null = null;
    if (recipe.length === 0) {
      const override: RecipeOverrideItem[] = Array.isArray(body.recipeOverride) ? body.recipeOverride : [];
      if (override.length > 0) {
        if (body.saveRecipe && item.productId) {
          recipe = await saveProductRecipe(item.productId, override);
        } else if (body.saveRecipe && !item.productId && item.description) {
          await saveFreeTextRecipe(item.description, override);
          recipe = await materializeOverride(override);
        } else {
          recipe = await materializeOverride(override);
        }
      } else if (!body.allowNoRecipe) {
        return NextResponse.json({ error: 'NO_RECIPE', productId: item.productId, reference: label, name: item.product?.name ?? null }, { status: 409 });
      } else {
        noRecipeWarning = `Aucune recette définie pour ${label} — la production a été enregistrée sans vérifier/consommer de matière première.`;
      }
    }

    // Consomme définitivement les matières premières pour la quantité produite. Vérification
    // globale D'ABORD, sur TOUTES les matières de la recette, avant de toucher quoi que ce soit
    // (cf. checkAndConsumeRecipe) : si une seule matière n'a physiquement pas assez de stock,
    // on arrête tout net, rien n'est modifié.
    //
    // `ownNeededCap` : pour un vrai produit, son propre `neededQuantity` (la matière a déjà été
    // mise de côté pour lui à la confirmation) ; pour une ligne LIBRE, toujours 0 — rien n'a
    // jamais été réservé à l'avance pour elle (cf. checkAndConsumeRecipe pour le détail).
    const result = await checkAndConsumeRecipe(recipe, qty, item.productId ? item.neededQuantity : 0, false);
    if (!result.ok) {
      const detail = result.shortfalls.map((s) => `${s.name} (manque ${s.missing} ${s.unit})`).join(', ');
      return NextResponse.json({ error: `Stock matière insuffisant pour produire cette quantité : ${detail}`, shortfalls: result.shortfalls }, { status: 409 });
    }
    const touchedByReserved = result.touchedByReserved;

    // `producedQuantity` est un pur compteur historique (jamais dérivé) — on l'incrémente
    // directement. Le besoin/buffer, eux, sont entièrement recalculés ensuite, plus besoin de
    // replier "à la main" ce qui a été produit dans l'un ou l'autre champ.
    await prisma.productionListItem.update({ where: { id }, data: { producedQuantity: { increment: qty } } });

    if (item.productId) {
      // Distribue la quantité produite aux commandes/devis liés (→ Réservé, FIFO), le reliquat
      // éventuel (réassort manuel/seuil) part en Disponible.
      await distributeProduction(id, qty, item.productId);
      // Recalcule entièrement à neuf le besoin + le buffer de cette ligne (les commandes
      // viennent d'avancer, le disponible a pu bouger) — marque "Produit" si plus rien ne
      // manque, et recalcule la matière première en cascade.
      await resyncProductionLine(item.productId);
    } else {
      // Ligne LIBRE : jamais partagée, un seul article lié — pas de FIFO à faire, pas de
      // disponible/réservé produit à toucher (rien n'existe pour elle).
      const orderItem = await prisma.orderItem.findFirst({ where: { productionListItemId: id } });
      const quoteItem = orderItem ? null : await prisma.quoteItem.findFirst({ where: { productionListItemId: id } });
      if (orderItem) {
        const take = Math.min(qty, orderItem.quantity - orderItem.resolvedQuantity);
        if (take > 0) {
          await prisma.orderItem.update({ where: { id: orderItem.id }, data: { resolvedQuantity: { increment: take } } });
          await checkCompletion('order', orderItem.orderId);
        }
      } else if (quoteItem) {
        const take = Math.min(qty, quoteItem.quantity - quoteItem.resolvedQuantity);
        if (take > 0) {
          await prisma.quoteItem.update({ where: { id: quoteItem.id }, data: { resolvedQuantity: { increment: take } } });
          await checkCompletion('quote', quoteItem.quoteId);
        }
      }
      await resyncFreeTextProductionLine(id);
    }

    // Si on vient d'empiéter sur le pot commun `reserved` (pas assez de disponible pour tout
    // couvrir), réévalue les AUTRES lignes "À produire" utilisant cette matière — les plus
    // récentes basculent "Bloquée" si elles ne sont plus couvertes, et la liste d'achat matière
    // se met à jour en conséquence. Fait APRÈS le recalcul ci-dessus pour que la ligne courante
    // compte déjà avec son besoin à jour dans cette réévaluation.
    for (const rawMaterialId of touchedByReserved) await reassessProductionForMaterial(rawMaterialId);

    const updated = await prisma.productionListItem.findUnique({ where: { id } });
    createAudit({ userId: session?.user?.id, action: `Production réalisée (+${qty})`, entity: 'STOCK', entityId: id, detail: label });
    return NextResponse.json({ ...updated, warning: noRecipeWarning });
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
