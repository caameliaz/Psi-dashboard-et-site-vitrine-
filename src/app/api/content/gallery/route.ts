import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { imageVersion } from '@/lib/image-version';

// Photos supplémentaires d'une page catégorie (miniatures sous la photo principale).
// Stockées dans SiteContent sous la clé `category_gallery_<categoryId>` (JSON : tableau de { src, productId } — `productId` null = photo de la catégorie entière ;
// ancien format : tableau de data URLs simples, lu comme productId null).
// Endpoint séparé de /api/content pour ne pas alourdir le footer / WhatsApp qui lisent tout le contenu.
export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId');
  if (!categoryId) return NextResponse.json({ error: 'categoryId requis' }, { status: 400 });

  try {
    const row = await prisma.siteContent.findUnique({ where: { key: `category_gallery_${categoryId}` } });
    let raw: unknown = [];
    try { raw = row ? JSON.parse(row.value) : []; } catch { raw = []; }
    const photos = (Array.isArray(raw) ? raw : [])
      .map((x: unknown) => typeof x === 'string'
        ? { src: x, productId: null }
        : { src: (x as { src?: string })?.src ?? '', productId: (x as { productId?: string | null })?.productId ?? null })
      .filter((x) => x.src);
    // Usages communs à toute la catégorie (3 max, choisis dans Contenu) — petits textes, renvoyés avec la galerie.
    let usages: string[] = [];
    try {
      const u = await prisma.siteContent.findUnique({ where: { key: `category_usages_${categoryId}` } });
      const parsed = u ? JSON.parse(u.value) : [];
      usages = (Array.isArray(parsed) ? parsed : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 3);
    } catch { usages = []; }
    // ?full=true (gestion admin, Contenu) : base64 complet pour pouvoir modifier puis ré-enregistrer, jamais en cache.
    if (request.nextUrl.searchParams.get('full') === 'true') return NextResponse.json({ photos, usages });
    // Public : l'URL de chaque photo (fichier image mis en cache par le navigateur) au lieu du base64 dans le JSON.
    const urls = photos.map((p, i) => ({
      src: `/api/content/gallery/image?categoryId=${encodeURIComponent(categoryId)}&i=${i}&v=${imageVersion(p.src)}`,
      productId: p.productId,
    }));
    return NextResponse.json({ photos: urls, usages }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    console.error('Error fetching category gallery:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}
