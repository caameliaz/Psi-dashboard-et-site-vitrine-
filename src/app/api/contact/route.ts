import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { validateEmail, validatePhone, validateText, firstError } from '@/lib/validation';

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
  const limited = rateLimit(request, 'contact', 5, 60_000); // 5 messages / min / IP
  if (limited) return limited;
  try {
    const body = await request.json();

    const primaryPhone: string = body.phone ?? '';
    const clientName: string = body.name ?? '';
    const clientCompany: string = body.company ?? '';
    const message: string = body.message ?? '';

    // Validation serveur (le client peut contourner la validation du navigateur)
    const vErr = firstError([
      validateText(clientName, 'Nom', 2, true, 200),
      validatePhone(primaryPhone, true),
      validateEmail(body.email ?? ''),
      validateText(clientCompany, 'Entreprise', 0, false, 200),
      validateText(message, 'Message', 0, false, 3000),
    ]);
    if (vErr) return NextResponse.json({ error: vErr }, { status: 400 });

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
        message,
      },
    });

    return NextResponse.json(contactRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating contact request:', error);
    return NextResponse.json({ error: 'Failed to create contact request' }, { status: 500 });
  }
}
