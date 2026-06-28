import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
