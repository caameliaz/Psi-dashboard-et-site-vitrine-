import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/clients — liste tous les clients (admin + employé)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const clients = await prisma.client.findMany({
      include: {
        phones: true,
        _count: { select: { orders: true, quotes: true } },
        orders: {
          select: {
            id: true,
            ref: true,
            createdAt: true,
            status: true,
            items: { select: { quantity: true, unitPrice: true, product: { select: { reference: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          select: {
            id: true,
            ref: true,
            createdAt: true,
            status: true,
            items: { select: { quantity: true, product: { select: { reference: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(clients);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST /api/clients — créer un nouveau client
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'name est requis' }, { status: 400 });

    const client = await prisma.client.create({
      data: {
        name: body.name,
        company: body.company ?? null,
        email: body.email ?? null,
        wilaya: body.wilaya ?? null,
        address: body.address ?? null,
        ...(body.phone ? {
          phones: { create: [{ number: body.phone, label: 'Principal', primary: true }] },
        } : {}),
      },
      include: { phones: true, _count: { select: { orders: true, quotes: true } } },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
