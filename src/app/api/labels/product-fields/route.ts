import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAudit } from '@/lib/audit';

// POST /api/labels/product-fields — « Enregistrer sur le produit » depuis la fenêtre d'impression des étiquettes :
// écrit le grammage et/ou le mandrin saisis dans les champs personnalisés du produit. ADMIN uniquement.
// Body : { items: [{ productId, grammage?, mandrin? }] } — valeurs numériques → unité ajoutée (« 55 g/m² », « 12 mm »).
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const items: { productId: string; grammage?: string; mandrin?: string }[] = (Array.isArray(body.items) ? body.items : [])
      .filter((i: any) => typeof i?.productId === 'string')
      .slice(0, 200);
    if (items.length === 0) return NextResponse.json({ error: 'Rien à enregistrer' }, { status: 400 });

    const withUnit = (raw: unknown, unit: string) => {
      const v = String(raw ?? '').trim();
      if (!v) return null;
      return /^\d+(?:[.,]\d+)?$/.test(v) ? `${v.replace(',', '.')} ${unit}` : v;
    };

    // Les champs « Grammage » et « Mandrin » existent déjà (paramètres produits) ; créés seulement s'ils manquent.
    const defs = await prisma.productFieldDef.findMany();
    const defFor = async (needle: string, label: string) => {
      const found = defs.find((d) => d.label.toLowerCase().includes(needle));
      if (found) return found;
      const created = await prisma.productFieldDef.create({ data: { label } });
      defs.push(created);
      return created;
    };

    let saved = 0;
    for (const it of items) {
      const product = await prisma.product.findUnique({ where: { id: it.productId }, select: { id: true, reference: true } });
      if (!product) continue;
      const parts: string[] = [];
      for (const [raw, needle, label, unit] of [[it.grammage, 'gramm', 'Grammage', 'g/m²'], [it.mandrin, 'mandrin', 'Mandrin', 'mm']] as const) {
        const value = withUnit(raw, unit);
        if (!value) continue;
        const def = await defFor(needle, label);
        await prisma.productCustomField.upsert({
          where: { productId_definitionId: { productId: product.id, definitionId: def.id } },
          create: { productId: product.id, definitionId: def.id, value },
          update: { value },
        });
        parts.push(`${label} ${value}`);
        saved++;
      }
      if (parts.length > 0) {
        createAudit({
          userId: session.user.id,
          action: 'Champs produit renseignés depuis l\'étiquette',
          entity: 'PRODUIT',
          entityId: product.id,
          detail: `${product.reference} — ${parts.join(', ')}`,
        });
      }
    }
    return NextResponse.json({ ok: true, saved });
  } catch (e) {
    console.error('[labels/product-fields]', e);
    return NextResponse.json({ error: 'Impossible d\'enregistrer sur le produit' }, { status: 500 });
  }
}
