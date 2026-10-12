import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dataUrlToImageResponse } from '@/lib/image-version';

// GET /api/content/gallery/image?categoryId=…&i=<position> — une photo de galerie en vrai fichier
// image (cachée par le navigateur) au lieu du base64 dans le JSON. `&v=` = empreinte, cf. image-version.ts.
export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId');
  const i = Number(request.nextUrl.searchParams.get('i'));
  if (!categoryId || !Number.isInteger(i) || i < 0) return new NextResponse(null, { status: 400 });
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: `category_gallery_${categoryId}` } });
    let raw: unknown = [];
    try { raw = row ? JSON.parse(row.value) : []; } catch { raw = []; }
    // Même normalisation que GET /api/content/gallery (entrées vides écartées) pour que l'index `i` corresponde.
    const srcs = (Array.isArray(raw) ? raw : [])
      .map((x: unknown) => (typeof x === 'string' ? x : (x as { src?: string } | null)?.src ?? ''))
      .filter(Boolean);
    const src = srcs[i];
    return dataUrlToImageResponse(src);
  } catch (e) {
    console.error(e);
    return new NextResponse(null, { status: 500 });
  }
}
