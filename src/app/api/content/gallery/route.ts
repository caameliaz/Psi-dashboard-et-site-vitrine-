import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Photos supplémentaires d'une page catégorie (miniatures sous la photo principale).
// Stockées dans SiteContent sous la clé `category_gallery_<categoryId>` (JSON : tableau de data URLs).
// Endpoint séparé de /api/content pour ne pas alourdir le footer / WhatsApp qui lisent tout le contenu.
export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId');
  if (!categoryId) return NextResponse.json({ error: 'categoryId requis' }, { status: 400 });

  try {
    const row = await prisma.siteContent.findUnique({ where: { key: `category_gallery_${categoryId}` } });
    let photos: string[] = [];
    try { photos = row ? JSON.parse(row.value) : []; } catch { photos = []; }
    return NextResponse.json({ photos: Array.isArray(photos) ? photos : [] });
  } catch (error) {
    console.error('Error fetching category gallery:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}
