import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const orders = await prisma.order.findMany({
      include: {
        client: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create or find client
    let client = body.client.email
      ? await prisma.client.findFirst({ where: { email: body.client.email } })
      : null;

    if (!client) {
      client = await prisma.client.create({
        data: {
          name: body.client.name,
          email: body.client.email,
          phone: body.client.phone,
          company: body.client.company,
          wilaya: body.client.wilaya,
          address: body.client.address,
        },
      });
    }

    // Create order with items
    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
