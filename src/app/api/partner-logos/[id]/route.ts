import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/partner-logos/[id] — modifier le nom et/ou le logo d'un client
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_contenu');
  if (guard.error) return guard.error;

  const { id } = await params;
  try {
    const body = await request.json();
    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
    }

    const logo = await prisma.partnerLogo.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: String(body.name).trim() }),
        // `null` explicite = retirer le logo (garder le nom seul) ; absent = ne pas toucher au logo existant.
        ...(body.photo !== undefined && { photo: body.photo || null }),
      },
    });
    revalidatePath('/');
    return NextResponse.json(logo);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update partner logo' }, { status: 500 });
  }
}

// DELETE /api/partner-logos/[id] — retirer un client de la bande défilante
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_contenu');
  if (guard.error) return guard.error;

  const { id } = await params;
  try {
    await prisma.partnerLogo.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete partner logo' }, { status: 500 });
  }
}
