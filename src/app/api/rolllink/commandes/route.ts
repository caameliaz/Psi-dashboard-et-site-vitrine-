import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRollLinkApiKey } from '@/lib/rolllink-auth';
import { confirmStock } from '@/lib/order-stock';
import { rateLimit } from '@/lib/rate-limit';

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/rolllink/commandes — reçoit une commande RollLink, la crée comme
// Order interne (source ROLLINK), et délègue TOUT le traitement stock à la
// logique existante (confirmStock, cf. src/lib/order-stock.ts + TESTS-STOCK.md)
// — jamais réécrite ici.
// ═══════════════════════════════════════════════════════════════════════════

type IncomingLine = { productId?: string; quantite?: number };

// ⚠️ MODE TEST (par défaut) : RollLink est encore en phase de test. Tant que la variable d'environnement
// ROLLLINK_AFFECTE_STOCK n'est pas « oui », une commande RollLink est ENREGISTRÉE (référence, lignes) mais ne touche
// JAMAIS au vrai stock : aucune réservation, aucune ligne d'achat/production, aucune matière réservée. Elle reste
// « En attente » pour qu'aucun écran ne la traite comme confirmée. Au lancement officiel : ROLLLINK_AFFECTE_STOCK=oui.
const rollLinkAffecteLeStock = () => (process.env.ROLLLINK_AFFECTE_STOCK ?? '').trim().toLowerCase() === 'oui';

export async function POST(request: NextRequest) {
  const authError = checkRollLinkApiKey(request);
  if (authError) return authError;

  const limited = rateLimit(request, 'rolllink-commandes', 30, 60_000);
  if (limited) return limited;

  let body: { referenceCommande?: string; lignes?: IncomingLine[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête JSON invalide' }, { status: 400 });
  }

  const referenceCommande = String(body.referenceCommande ?? '').trim();
  const rawLignes = Array.isArray(body.lignes) ? body.lignes : [];

  if (!referenceCommande) {
    return NextResponse.json({ error: 'referenceCommande requis' }, { status: 400 });
  }
  const validLines = rawLignes.filter(
    (l) => l.productId && typeof l.productId === 'string' && Number(l.quantite) > 0,
  );
  if (validLines.length === 0) {
    return NextResponse.json({ error: 'Au moins une ligne valide (productId + quantite > 0) est requise' }, { status: 400 });
  }

  // Référence déjà traitée ? (idempotence — évite de dupliquer si RollLink renvoie deux fois)
  const already = await prisma.order.findUnique({ where: { ref: referenceCommande }, include: { items: true } });
  if (already) {
    return NextResponse.json({
      lignes: already.items.map((i) => ({ productId: i.productId, stockPath: i.stockPath })),
    });
  }

  // Prix : jamais fait confiance à une source externe pour le prix — recalculé depuis la base,
  // même logique que POST /api/orders.
  const productIds = [...new Set(validLines.map((l) => l.productId as string))];
  const dbProducts = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, price: true } });
  const priceById = new Map(dbProducts.map((p) => [p.id, p.price]));

  const foundIds = new Set(dbProducts.map((p) => p.id));
  const unknownIds = productIds.filter((id) => !foundIds.has(id));
  if (unknownIds.length > 0) {
    return NextResponse.json({ error: `Produit(s) inconnu(s) dans PSI Dash : ${unknownIds.join(', ')}` }, { status: 400 });
  }

  try {
    const order = await prisma.order.create({
      data: {
        ref: referenceCommande,
        source: 'ROLLINK',
        // Production : pas de circuit de validation manuelle pour RollLink — confirmé directement.
        // Test : « En attente », sans aucun effet sur le stock (cf. rollLinkAffecteLeStock).
        status: rollLinkAffecteLeStock() ? 'VALIDE' : 'EN_ATTENTE',
        items: {
          create: validLines.map((l) => ({
            productId: l.productId as string,
            quantity: Math.trunc(Number(l.quantite)),
            unitPrice: priceById.get(l.productId as string) ?? 0,
          })),
        },
      },
      include: { items: true },
    });

    // Logique de stock existante — réserve/production/achat selon dispo, inchangée. Sautée en mode test.
    if (rollLinkAffecteLeStock()) await confirmStock('order', order.id);

    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      select: { productId: true, stockPath: true, quantity: true },
    });

    if (!rollLinkAffecteLeStock()) {
      // SIMULATION : on répond à RollLink ce que la confirmation AURAIT décidé (mêmes règles que confirmStock),
      // pour que ses tests soient réalistes, SANS rien écrire dans le stock.
      const dispo = new Map((await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, available: true, mode: true } })).map((p) => [p.id, { available: p.available, mode: p.mode }]));
      const lignes = items.map((i) => {
        const p = dispo.get(i.productId as string);
        const pris = Math.min(p?.available ?? 0, i.quantity);
        if (p) p.available -= pris; // plusieurs lignes du même produit : le stock simulé baisse au fil des lignes
        const stockPath = pris >= i.quantity ? 'FROM_STOCK' : p?.mode === 'ACHETE' ? 'PURCHASE_PENDING' : 'IN_PRODUCTION';
        return { productId: i.productId, stockPath };
      });
      return NextResponse.json({ lignes, simulation: true });
    }

    return NextResponse.json({
      lignes: items.map((i) => ({ productId: i.productId, stockPath: i.stockPath })),
    });
  } catch (error: any) {
    console.error('[POST /api/rolllink/commandes] ERROR:', error);
    return NextResponse.json({
      error: 'Échec du traitement de la commande',
      detail: error?.message ?? String(error),
    }, { status: 500 });
  }
}
