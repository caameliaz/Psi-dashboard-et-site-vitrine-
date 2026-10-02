import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/cart-tracking — suivi ANONYME du panier du site public (aucune donnée
// personnelle : `anonId` est un identifiant aléatoire généré côté navigateur, jamais
// relié à un client). Appelé par le store panier à chaque changement de contenu
// (debounce côté client, pas à chaque frappe) — sert uniquement à mesurer combien de
// paniers sont créés / abandonnés / convertis (cf. schema.prisma CartSession).
// body: { anonId: string, itemsCount: number, totalAmount: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const anonId = typeof body.anonId === 'string' ? body.anonId.slice(0, 64) : '';
    const itemsCount = Number(body.itemsCount);
    const totalAmount = Number(body.totalAmount);
    if (!anonId || !Number.isFinite(itemsCount) || !Number.isFinite(totalAmount)) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }

    // Panier vidé (retour à 0) sans conversion : on ne le compte plus comme "en cours"
    // ni comme abandonné — la ligne est simplement effacée (rien à mesurer dessus).
    if (itemsCount <= 0) {
      await prisma.cartSession.deleteMany({ where: { anonId, status: 'EN_COURS' } });
      return NextResponse.json({ ok: true });
    }

    await prisma.cartSession.upsert({
      where: { anonId },
      create: { anonId, itemsCount, totalAmount, status: 'EN_COURS' },
      // Un panier qu'on modifie à nouveau après avoir été marqué "abandonné" repart
      // "en cours" (le visiteur est revenu) — updatedAt suit automatiquement (@updatedAt).
      update: { itemsCount, totalAmount, status: 'EN_COURS' },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to track cart' }, { status: 500 });
  }
}

// PATCH /api/cart-tracking — marque la session panier convertie (commande/devis validé).
// body: { anonId: string }
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const anonId = typeof body.anonId === 'string' ? body.anonId.slice(0, 64) : '';
    if (!anonId) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });

    await prisma.cartSession.updateMany({
      where: { anonId, status: { not: 'CONVERTI' } },
      data: { status: 'CONVERTI', convertedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to convert cart' }, { status: 500 });
  }
}
