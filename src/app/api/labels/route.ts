import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { labelDataFor, SITE_URL, type ReceiptKind } from '@/lib/receipt';

// POST /api/labels — données des étiquettes (tableau produits + jeton du QR) pour une ou plusieurs
// commandes/devis. Body : { entries: [{ kind: 'order' | 'quote', id, count }] }. Réservé aux comptes connectés.
// Mémorise aussi le nombre de colis générés (`labelCount`) affiché dans le détail.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const entries: { kind: ReceiptKind; id: string; count: number }[] = (Array.isArray(body.entries) ? body.entries : [])
      .filter((e: any) => (e?.kind === 'order' || e?.kind === 'quote') && typeof e?.id === 'string')
      .slice(0, 100)
      .map((e: any) => ({ kind: e.kind, id: e.id, count: Math.min(200, Math.max(1, Math.floor(Number(e.count) || 1))) }));
    if (entries.length === 0) return NextResponse.json({ error: 'Aucune commande ou devis sélectionné' }, { status: 400 });

    const labels = [];
    for (const e of entries) {
      const data = await labelDataFor(e.kind, e.id);
      if (!data) continue;
      labels.push({ ...data, count: e.count, url: `${SITE_URL}/r/${data.token}` });
      // Aperçu des données (pour savoir s'il manque un grammage/mandrin) : on ne touche pas au compteur de colis.
      if (body.dryRun === true) continue;
      const upd = { where: { id: e.id }, data: { labelCount: e.count } };
      if (e.kind === 'order') await prisma.order.update(upd); else await prisma.quote.update(upd);
    }
    return NextResponse.json({ labels, siteUrl: SITE_URL });
  } catch (e) {
    console.error('[labels]', e);
    return NextResponse.json({ error: 'Impossible de préparer les étiquettes' }, { status: 500 });
  }
}
