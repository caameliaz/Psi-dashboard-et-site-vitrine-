import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/categories/[id]/image — la photo de la catégorie en vrai fichier image (et non en base64
// dans le JSON / le HTML). Téléchargée une seule fois puis mise en cache par le navigateur et le
// CDN. L'URL porte `?v=<taille>` : changer la photo change l'URL, donc le cache long est sûr.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const row = await prisma.category.findUnique({ where: { id }, select: { photo: true } });
    const m = row?.photo?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
    if (!m) return new NextResponse(null, { status: 404 });
    return new NextResponse(Buffer.from(m[2], 'base64'), {
      headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse(null, { status: 500 });
  }
}
