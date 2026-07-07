import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/clients/[id]/phones — ajouter un numéro (permission modifier_clients)
export async function POST(request: NextRequest, { params }: Ctx) {
  const guard = await requirePermission('modifier_clients');
  if (guard.error) return guard.error;

  const { id: clientId } = await params;

  try {
    const body = await request.json();

    if (!body.number) {
      return NextResponse.json({ error: 'Le numéro est requis' }, { status: 400 });
    }

    const phone = await prisma.clientPhone.create({
      data: {
        clientId,
        number: body.number,
        label: body.label ?? 'Principal',
        primary: body.primary ?? false,
      },
    });

    return NextResponse.json(phone, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to add phone' }, { status: 500 });
  }
}
