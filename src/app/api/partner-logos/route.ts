import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

// GET /api/partner-logos — tous les logos clients, triés (public : alimente la bande défilante)
export async function GET() {
  try {
    const logos = await prisma.partnerLogo.findMany({ orderBy: { order: 'asc' } });
    return NextResponse.json(logos);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch partner logos' }, { status: 500 });
  }
}

// POST /api/partner-logos — ajouter un client (permission modifier_contenu)
export async function POST(request: NextRequest) {
  const guard = await requirePermission('modifier_contenu');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    const last = await prisma.partnerLogo.findFirst({ orderBy: { order: 'desc' } });
    const order = last ? last.order + 1 : 0;

    const logo = await prisma.partnerLogo.create({
      // Logo facultatif : un client sans logo s'affiche avec un badge initiales (cf. PartnerLogosMarquee).
      data: { name: body.name, photo: body.photo || null, order },
    });
    revalidatePath('/');
    return NextResponse.json(logo, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create partner logo' }, { status: 500 });
  }
}
