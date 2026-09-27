import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fixerReferenceProduit, fixerReferenceMatiere } from '@/lib/stock-reference';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';
import { resyncMaterialBufferOnly, reallocateAvailableStock, unblockProductionForMaterial } from '@/lib/order-stock';

// POST /api/stock/restock — augmente le stock d'un produit ou d'une matière première.
// Pour un produit fabriqué (mode FABRIQUE ou LES_DEUX avec mode:'produire'), décrémente
// automatiquement les matières premières de sa recette (recette au niveau global).
// body: { type: 'product' | 'material', id: string, quantity: number, mode?: 'produire' | 'acheter',
//         matieresRestantes?: { [rawMaterialId]: number } }
// `matieresRestantes` (facultatif, produit fabriqué) : disponible RÉEL de chaque matière saisi à la
// main au moment de la production — aucun calcul, la valeur saisie devient le disponible (comme
// une correction). Appliqué APRÈS l'éventuelle recette : la saisie manuelle a le dernier mot.
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
        // Vérifie qu'il y a assez de matières premières avant de produire. Sinon l'écran propose
        // de les réapprovisionner, ou — admins seulement — de produire quand même (`forcer` :
        // consomme ce qui reste, la matière descend à 0, jamais en négatif).
        const materials = await prisma.rawMaterial.findMany({ where: { id: { in: product.recipeItems.map((r) => r.rawMaterialId) } } });
        const manques = product.recipeItems.flatMap((item) => {
          const mat = materials.find((m) => m.id === item.rawMaterialId);
          const besoin = item.quantity * qty;
          if (!mat || mat.available >= besoin) return [];
          return [{ rawMaterialId: item.rawMaterialId, reference: mat.reference, name: mat.name, unit: mat.unit, missing: besoin - mat.available }];
        });
        if (manques.length > 0) {
          const detail = manques.map((m) => `${m.name} (manque ${m.missing} ${m.unit})`).join(', ');
          const estAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
          if (!(body.forcer && estAdmin)) {
            return NextResponse.json({ error: `Stock insuffisant en matière première : ${detail}`, code: 'MATIERE_INSUFFISANTE', produit: product.name ?? product.reference, shortfalls: manques }, { status: 409 });
          }
          createAudit({ userId: session?.user?.id, action: 'Production forcée malgré le manque de matière', entity: 'STOCK', entityId: product.id, detail: `${product.name ?? product.reference} (+${qty}) — ${detail}` });
        }
        await prisma.$transaction([
          prisma.product.update({ where: { id: product.id }, data: { available: { increment: qty } } }),
          ...product.recipeItems.map((item) => {
            const dispo = materials.find((m) => m.id === item.rawMaterialId)?.available ?? 0;
            return prisma.rawMaterial.update({ where: { id: item.rawMaterialId }, data: { available: { decrement: Math.max(0, Math.min(item.quantity * qty, dispo)) } } });
          }),
        ]);
      } else {
        await prisma.product.update({ where: { id: product.id }, data: { available: { increment: qty } } });
      }

      createAudit({ userId: session?.user?.id, action: `Stock produit approvisionné (+${qty})`, entity: 'STOCK', entityId: product.id, detail: `${product.name ?? product.reference} — ${effectiveMode}` });
      // Entrée de stock → le disponible obtenu devient la référence (100 %), seuil à 30 %
      await fixerReferenceProduit(product.id, product.available);

      // Le disponible du produit vient d'augmenter → proposer ce stock EN PRIORITÉ aux autres
      // commandes/devis déjà en attente sur ce même produit (FIFO), avant de laisser le
      // reliquat compter comme simple buffer — même logique que la réception en liste d'achat
      // ou l'annulation d'une commande. `reallocateAvailableStock` recalcule aussi le buffer
      // du produit (et de sa matière en cascade) à la fin, dans tous les cas.
      await reallocateAvailableStock(product.id);
      // Les matières consommées ci-dessus (mode "produire") ont vu leur disponible BAISSER —
      // seul leur buffer est concerné (pas de réaffectation à faire, rien ne se libère ici).
      if (effectiveMode === 'produire' && product.recipeItems.length > 0) {
        for (const r of product.recipeItems) await resyncMaterialBufferOnly(r.rawMaterialId);
      }

      // Matière restante saisie à la main (champs laissés vides = non envoyés = inchangés)
      const restes: Record<string, unknown> =
        effectiveMode === 'produire' && body.matieresRestantes && typeof body.matieresRestantes === 'object' ? body.matieresRestantes : {};
      for (const [matiereId, valeur] of Object.entries(restes)) {
        const reste = Number(valeur);
        if (!Number.isFinite(reste) || reste < 0) continue;
        const avant = await prisma.rawMaterial.findUnique({ where: { id: matiereId }, select: { available: true, name: true, reference: true } });
        if (!avant || avant.available === reste) continue;
        await prisma.rawMaterial.update({ where: { id: matiereId }, data: { available: reste } });
        createAudit({ userId: session?.user?.id, action: 'Matière restante saisie (production)', entity: 'MATIERE', entityId: matiereId, detail: `${avant.name} (${avant.reference}) : ${avant.available} → ${reste} — après production de ${product.name ?? product.reference}` });
        if (reste > avant.available) {
          // Hausse = entrée de stock → nouvelle référence (100 %), comme une correction à la hausse
          await fixerReferenceMatiere(matiereId, avant.available);
          await unblockProductionForMaterial(matiereId);
        }
        // Baisse : la référence ne change pas → l'alerte à 70 % consommés se déclenche normalement
        await resyncMaterialBufferOnly(matiereId);
      }

      return NextResponse.json({ ok: true, mode: effectiveMode });
    }

    if (body.type === 'material') {
      const material = await prisma.rawMaterial.findUnique({ where: { id: body.id } });
      if (!material) return NextResponse.json({ error: 'Matière première introuvable' }, { status: 404 });

      await prisma.rawMaterial.update({ where: { id: material.id }, data: { available: { increment: qty } } });
      createAudit({ userId: session?.user?.id, action: `Stock matière approvisionné (+${qty})`, entity: 'MATIERE', entityId: material.id, detail: `${material.name} (${material.reference})` });
      // Entrée de stock → le disponible obtenu devient la référence (100 %), seuil à 30 %
      await fixerReferenceMatiere(material.id, material.available);
      // Le disponible de la matière vient d'augmenter → débloque d'abord les lignes de
      // production "Bloquées" qui l'attendaient (même logique que la réception en liste
      // d'achat), avant de recalculer son propre buffer sur ce qui reste.
      await unblockProductionForMaterial(material.id);
      await resyncMaterialBufferOnly(material.id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Type invalide ('product' | 'material')" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to restock' }, { status: 500 });
  }
}
