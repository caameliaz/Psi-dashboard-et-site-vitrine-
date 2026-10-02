import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

// GET /api/categories — toutes les catégories (public)
// `photo` (base64, souvent >10 Ko/catégorie) est omis par défaut : la plupart des appelants
// ne s'en servent que pour un menu déroulant (id/nom). ?withPhoto=true pour les vues qui
// affichent vraiment l'image (page produit, vitrine catégories, gestion catégories admin).
export async function GET(request: NextRequest) {
  const withPhoto = request.nextUrl.searchParams.get('withPhoto') === 'true';
  // Gestion admin (?admin=true) : toujours frais. Le reste est mis en cache CDN 60 s.
  const admin = request.nextUrl.searchParams.get('admin') === 'true';
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      omit: withPhoto ? undefined : { photo: true },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(categories, admin ? undefined : { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories — créer une catégorie (permission modifier_produits)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_produits');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    const last = await prisma.category.findFirst({ orderBy: { order: 'desc' } });
    const order = last ? last.order + 1 : 0;

    const category = await prisma.category.create({
      data: {
        name: body.name,
        order: body.order ?? order,
        photo: body.photo ?? null,
        description: body.description ?? null,
        prefix: body.prefix ? String(body.prefix).toUpperCase().trim() : null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
