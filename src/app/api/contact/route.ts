import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create or find client
    let client = await prisma.client.findFirst({
      where: { email: body.email },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: body.name,
          email: body.email,
          phone: body.phone,
          wilaya: body.wilaya || 'Non spécifié',
        },
      });
    }

    const contactRequest = await prisma.contactRequest.create({
      data: {
        clientId: client.id,
        type: body.type,
        message: body.message,
      },
    });

    return NextResponse.json(contactRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating contact request:', error);
    return NextResponse.json(
      { error: 'Failed to create contact request' },
      { status: 500 }
    );
  }
}
