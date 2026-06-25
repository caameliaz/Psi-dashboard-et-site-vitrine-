import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const quotes = await prisma.quote.findMany({
      include: { client: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

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
          company: body.company,
          wilaya: body.wilaya || 'Non spécifié',
        },
      });
    }

    const quote = await prisma.quote.create({
      data: {
        clientId: client.id,
        width: body.width ? parseInt(body.width) : null,
        length: body.length ? parseInt(body.length) : null,
        quantity: body.quantity ? parseInt(body.quantity) : null,
        message: body.message,
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
