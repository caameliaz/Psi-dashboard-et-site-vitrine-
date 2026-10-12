import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dataUrlToImageResponse } from '@/lib/image-version';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/products/[id]/image — la photo d'une référence en vrai fichier image (cachée par le
// navigateur) au lieu du base64 dans le JSON de /api/products. `?v=` = empreinte, cf. image-version.ts.
export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  try {
    const row = await prisma.product.findUnique({ where: { id }, select: { photo: true, active: true, visibleOnSite: true } });
    // Public : seulement les produits affichés sur le site (comme /api/products sans ?all)
    if (!row || !row.active || !row.visibleOnSite) return new NextResponse(null, { status: 404 });
    return dataUrlToImageResponse(row.photo);
  } catch (e) {
    console.error(e);
    return new NextResponse(null, { status: 500 });
  }
}
