import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { createAudit } from '@/lib/audit';

// GET /api/products — produits actifs (public)
// GET /api/products?all=true — tous les produits (admin)
export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.get('all') === 'true';

  if (all) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      // Dashboard (?all=true) : tous les produits, quel que soit leur statut.
      // Site public : actif ET visible sur le site — deux cases indépendantes
      // (un produit peut être actif/géré au dashboard sans être affiché en vitrine).
      where: all ? undefined : { active: true, visibleOnSite: true },
      include: {
        category: true,
        customFields: { include: { definition: true } },
        recipeItems: { include: { rawMaterial: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(products);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST /api/products — créer un produit (permission modifier_produits)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;
  const session = guard.session;

  try {
    const body = await request.json();

    if (!body.categoryId || body.width == null || body.length == null || body.price == null) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    // Référence auto-générée si la catégorie a un préfixe (ex: PTT → PTT-001),
    // sinon on garde la référence saisie manuellement.
    const category = await prisma.category.findUnique({
      where: { id: body.categoryId },
      select: { prefix: true, refCounter: true },
    });
    if (!category) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 400 });

    let reference: string;
    if (category.prefix) {
      const next = category.refCounter + 1;
      reference = `${category.prefix}-${String(next).padStart(3, '0')}`;
      await prisma.category.update({ where: { id: body.categoryId }, data: { refCounter: next } });
    } else {
      if (!body.reference) return NextResponse.json({ error: 'Référence requise (catégorie sans préfixe)' }, { status: 400 });
      reference = body.reference;
    }

    // Stock max : fourni, sinon valeur par défaut du schéma (140). Sert de base au
    // calcul des seuils par défaut (50%) quand ils ne sont pas fournis explicitement.
    const stockMax = body.stockMax != null ? Number(body.stockMax) : 140;
    const defaultThreshold = Math.round(stockMax * 0.5);

    const product = await prisma.product.create({
      data: {
        reference,
        name: body.name ?? null,
        width: Number(body.width),
        length: Number(body.length),
        metrage: body.metrage != null ? Number(body.metrage) : null,
        usage: body.usage ?? '',
        price: Number(body.price),
        photo: body.photo ?? null,
        active: body.active ?? true,
        visibleOnSite: body.visibleOnSite ?? true,
        categoryId: body.categoryId,
        stockMax,
        ...(body.mode !== undefined && { mode: body.mode }),
        ...(body.purchasePrice !== undefined && { purchasePrice: body.purchasePrice != null ? Number(body.purchasePrice) : null }),
        ...(body.available !== undefined && { available: Number(body.available) }),
        purchaseThreshold: body.purchaseThreshold != null ? Number(body.purchaseThreshold) : defaultThreshold,
        productionThreshold: body.productionThreshold != null ? Number(body.productionThreshold) : defaultThreshold,
      },
      include: { category: true, customFields: { include: { definition: true } }, recipeItems: { include: { rawMaterial: true } } },
    });

    const prodLabel = product.name ? `${product.name} (${product.reference})` : product.reference;
    createAudit({ userId: session?.user?.id, action: 'Produit créé', entity: 'PRODUIT', entityId: product.id, detail: prodLabel });
    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
