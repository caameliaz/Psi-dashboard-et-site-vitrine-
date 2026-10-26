import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/contact/[id] — modifier statut / notes (admin + employé)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_contenu');
  if (guard.error) return guard.error;
  const session = guard.session;

  const { id } = await params;

  try {
    const body = await request.json();

    const contact = await prisma.contactRequest.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
      include: { client: { omit: { photo: true }, include: { phones: true } } },
    });

    return NextResponse.json(contact);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}
