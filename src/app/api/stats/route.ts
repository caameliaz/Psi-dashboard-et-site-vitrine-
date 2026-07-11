import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/stats — agrégats pour le dashboard (1 seule requête DB)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      commandesMois,
      commandesPrevMois,
      livreesMois,
      devisLivresMois,
      clientsMois,
      devisEnCours,
      devisEnAttenteAgg,
      commandesAujourdhui,
      attenteCommandes,
      attenteDevis,
      contacteCommandes,
      topProduits,
      sourceOrders,
      sourceQuotes,
      ordersByWilaya,
      ordersFor6Months,
      quotesFor6Months,
      ordersByEmploye,
      recentOrders,
      recentQuotes,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      prisma.order.count({ where: { status: 'LIVRE', createdAt: { gte: startOfMonth } } }),
      prisma.quote.count({ where: { status: 'LIVRE', createdAt: { gte: startOfMonth } } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.quote.count({ where: { status: { in: ['EN_ATTENTE', 'CONTACTE'] } } }),
      prisma.quote.aggregate({ _sum: { proposedPrice: true }, where: { status: { in: ['EN_ATTENTE', 'CONTACTE'] } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'EN_ATTENTE' } }),
      prisma.quote.count({ where: { status: 'EN_ATTENTE' } }),
      prisma.order.count({ where: { status: 'CONTACTE' } }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 6,
      }),
      prisma.order.groupBy({ by: ['source'], _count: { id: true } }),
      prisma.quote.groupBy({ by: ['source'], _count: { id: true } }),
      // Commandes par wilaya (snapshot clientWilaya, fallback géré côté résolution)
      prisma.order.groupBy({ by: ['clientWilaya'], _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
      // Commandes des 6 derniers mois (pour la courbe)
      prisma.order.findMany({ where: { createdAt: { gte: start6MonthsAgo } }, select: { createdAt: true } }),
      prisma.quote.findMany({ where: { createdAt: { gte: start6MonthsAgo } }, select: { createdAt: true } }),
      // Commandes créées ce mois par employé
      prisma.order.groupBy({ by: ['createdById'], _count: { id: true }, where: { createdAt: { gte: startOfMonth }, createdById: { not: null } } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, ref: true, status: true, source: true, createdAt: true,
          clientName: true, clientCompany: true, clientWilaya: true,
          client: { select: { name: true, company: true, wilaya: true, email: true, phones: { where: { primary: true }, select: { number: true } } } },
          items: { select: { quantity: true, unitPrice: true, product: { select: { reference: true } } } },
        },
      }),
      prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, ref: true, status: true, source: true, message: true, proposedPrice: true, createdAt: true,
          clientName: true, clientCompany: true, clientWilaya: true,
          client: { select: { name: true, company: true, wilaya: true, email: true, phones: { where: { primary: true }, select: { number: true } } } },
          items: { select: { quantity: true, product: { select: { reference: true } } } },
        },
      }),
    ]);

    // Résoudre refs + catégories pour topProduits
    const productIds = topProduits.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, reference: true, category: { select: { id: true, name: true } } },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Construire top par catégorie : meilleur produit par catégorie (max 6 catégories)
    const topWithMeta = topProduits.map((g) => {
      const p = productMap[g.productId];
      return { ref: p?.reference ?? 'Inconnu', qty: g._sum.quantity ?? 0, categoryId: p?.category?.id ?? null, categoryName: p?.category?.name ?? 'Sans catégorie' };
    });

    const categories = [...new Set(topWithMeta.map((t) => t.categoryId))];
    let topProduitsFinal: { ref: string; qty: number; label: string }[];

    if (categories.length <= 2) {
      // Fallback : top 6 produits en général
      topProduitsFinal = topWithMeta.slice(0, 6).map((t) => ({ ref: t.ref, qty: t.qty, label: t.ref }));
    } else {
      // Un meilleur produit par catégorie (déjà trié par qty desc)
      const seen = new Set<string | null>();
      topProduitsFinal = topWithMeta
        .filter((t) => { if (seen.has(t.categoryId)) return false; seen.add(t.categoryId); return true; })
        .slice(0, 6)
        .map((t) => ({ ref: t.ref, qty: t.qty, label: t.categoryName }));
    }

    // Source : tout ce qui n'est pas SITE → Manuel
    const sourceCounts = { site: 0, manuel: 0 };
    [...sourceOrders, ...sourceQuotes].forEach((g) => {
      const count = (g._count as { id: number }).id;
      if ((g.source as string) === 'SITE') sourceCounts.site += count;
      else sourceCounts.manuel += count;
    });

    // Évolution commandes vs mois précédent (%)
    const evolutionCommandes = commandesPrevMois === 0
      ? (commandesMois > 0 ? 100 : 0)
      : Math.round(((commandesMois - commandesPrevMois) / commandesPrevMois) * 100);

    // Top wilayas (commandes) — ignore les wilayas vides
    const topWilayas = ordersByWilaya
      .filter((g) => g.clientWilaya)
      .map((g) => ({ wilaya: g.clientWilaya as string, count: g._count.id }))
      .slice(0, 10);

    // Série 6 mois : commandes + devis par mois (labels courts)
    const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const serie: { mois: string; commandes: number; devis: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      serie.push({ mois: MOIS[d.getMonth()], commandes: 0, devis: 0 });
      const idx = serie.length - 1;
      ordersFor6Months.forEach((o) => {
        const od = new Date(o.createdAt);
        if (`${od.getFullYear()}-${od.getMonth()}` === key) serie[idx].commandes++;
      });
      quotesFor6Months.forEach((q) => {
        const qd = new Date(q.createdAt);
        if (`${qd.getFullYear()}-${qd.getMonth()}` === key) serie[idx].devis++;
      });
    }

    // Employés actifs ce mois : résout les noms
    const empIds = ordersByEmploye.map((g) => g.createdById as string);
    const emps = empIds.length
      ? await prisma.user.findMany({ where: { id: { in: empIds } }, select: { id: true, name: true } })
      : [];
    const empMap = Object.fromEntries(emps.map((u) => [u.id, u.name]));
    const employesActifs = ordersByEmploye
      .map((g) => ({ name: empMap[g.createdById as string] ?? 'Inconnu', count: g._count.id }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      stats: {
        commandes: commandesMois,
        livrees: livreesMois + devisLivresMois, // devis livré = vente (compté comme livraison)
        clients: clientsMois,
        devis: devisEnCours,
      },
      todayStats: {
        commandes: commandesAujourdhui,
        attente: attenteCommandes + attenteDevis,
        contactes: contacteCommandes,
      },
      // Nouvelles stats (P2)
      evolutionCommandes,        // % vs mois précédent
      commandesPrevMois,
      devisEnAttente: { count: attenteDevis, montant: devisEnAttenteAgg._sum.proposedPrice ?? 0 },
      topWilayas,                // [{ wilaya, count }]
      serie6Mois: serie,         // [{ mois, commandes, devis }]
      employesActifs,            // [{ name, count }]
      topProduits: topProduitsFinal,
      sourceStats: sourceCounts,
      recentOrders,
      recentQuotes,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
