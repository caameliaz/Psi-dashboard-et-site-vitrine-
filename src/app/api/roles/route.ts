import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const roles = await prisma.customRole.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(roles);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await requirePermission('gerer_utilisateurs');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'name requis' }, { status: 400 });

    const role = await prisma.customRole.create({
      data: { name: body.name, permissions: body.permissions ?? [] },
    });
    return NextResponse.json(role, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Ce nom de rôle existe déjà' }, { status: 409 });
    console.error(e);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
