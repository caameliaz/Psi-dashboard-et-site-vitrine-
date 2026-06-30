import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/users/[id] — modifier rôle / statut / infos (admin uniquement)
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.photo !== undefined) data.photo = body.photo;
    if (body.password !== undefined) data.password = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, role: true,
        active: true, phone: true, photo: true, createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE /api/users/[id] — supprimer un utilisateur (admin uniquement)
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
