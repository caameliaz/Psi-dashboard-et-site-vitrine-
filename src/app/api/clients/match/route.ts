import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { resolveClientVisibility } from '@/lib/leave';

// GET /api/clients/match?id=&phone=&company=&name= — retrouve la fiche client que la création
// d'une commande va utiliser (même ordre de recherche que POST /api/orders : id, téléphone,
// entreprise/nom). Sert au pop-up "enregistrer ces infos sur la fiche client ?".
export async function GET(request: NextRequest) {
  const guard = await requirePermission('voir_commandes');
  if (guard.error) return guard.error;

  const sp = request.nextUrl.searchParams;
  const id = sp.get('id') ?? '';
  const phone = sp.get('phone') ?? '';
  const company = sp.get('company') ?? '';
  const name = sp.get('name') ?? '';

  try {
    let client = id ? await prisma.client.findUnique({ where: { id }, include: { phones: true } }) : null;
    if (!client && phone) {
      client = await prisma.client.findFirst({ where: { phones: { some: { number: phone } } }, include: { phones: true } });
    }
    if (!client && (company || name)) {
      client = await prisma.client.findFirst({
        where: company ? { company: { equals: company, mode: 'insensitive' } } : { name: { equals: name, mode: 'insensitive' } },
        include: { phones: true },
      });
    }
    if (!client) return NextResponse.json({ client: null });

    if (guard.session!.user.role !== 'ADMIN') {
      const { visibleClientIds } = await resolveClientVisibility(guard.session!.user.id);
      if (!visibleClientIds.includes(client.id)) return NextResponse.json({ client: null });
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        company: client.company,
        email: client.email,
        commune: client.commune,
        phones: client.phones.map((p) => p.number),
      },
    });
  } catch (e) {
    console.error('[GET /api/clients/match]', e);
    return NextResponse.json({ error: 'Recherche du client impossible' }, { status: 500 });
  }
}
