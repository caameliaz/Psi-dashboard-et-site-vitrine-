import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/contact — liste tous les messages de contact (admin + employé)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const contacts = await prisma.contactRequest.findMany({
      include: { client: { include: { phones: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(contacts);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

// POST /api/contact — envoyer un message de contact (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const primaryPhone: string = body.phone ?? '';
    let client = primaryPhone
      ? await prisma.client.findFirst({
          where: { phones: { some: { number: primaryPhone } } },
        })
      : null;

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: body.name,
          company: body.company ?? null,
          email: body.email ?? null,
          wilaya: body.wilaya ?? 'Non spécifié',
          phones: {
            create: primaryPhone
              ? [{ number: primaryPhone, label: 'Principal', primary: true }]
              : [],
          },
        },
      });
    }

    const contactRequest = await prisma.contactRequest.create({
      data: {
        clientId: client.id,
        message: body.message ?? '',
      },
    });

    return NextResponse.json(contactRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating contact request:', error);
    return NextResponse.json({ error: 'Failed to create contact request' }, { status: 500 });
  }
}
