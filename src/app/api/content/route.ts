import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/permissions';

export async function GET() {
  try {
    const content = await prisma.siteContent.findMany();

    const contentMap = content.reduce(
      (acc: Record<string, string>, item: any) => ({
        ...acc,
        [item.key]: item.value,
      }),
      {}
    );

    return NextResponse.json(contentMap);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const guard = await requirePermission('modifier_contenu');
  if (guard.error) return guard.error;

  try {
    const body = await request.json();

    // Upsert each content item
    for (const [key, value] of Object.entries(body)) {
      await prisma.siteContent.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }

    revalidatePath('/');
    revalidatePath('/contact');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}
