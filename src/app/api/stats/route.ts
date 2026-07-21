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
      devisMois,
      devisPrevMois,
      ordersLivrees,
      quotesLivres,
      prevOrderItems,
      prevQuotesAgg,
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
      recentOrders,
      recentQuotes,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      prisma.quote.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.quote.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      // Commandes LIVRÉES ce mois (montant via items + assigné) — pour ventes + par commercial + employés
      prisma.order.findMany({
        where: { status: 'LIVRE', createdAt: { gte: startOfMonth } },
        select: { assignedToId: true, items: { select: { quantity: true, unitPrice: true } } },
      }),
      // Devis LIVRÉS ce mois (proposedPrice + assigné)
      prisma.quote.findMany({
        where: { status: 'LIVRE', createdAt: { gte: startOfMonth } },
        select: { assignedToId: true, proposedPrice: true },
      }),
      // Commandes + devis livrés le MOIS PRÉCÉDENT (montant global, pour l'évolution des ventes)
      prisma.orderItem.findMany({
        where: { order: { status: 'LIVRE', createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } },
        select: { quantity: true, unitPrice: true },
      }),
      prisma.quote.aggregate({ _sum: { proposedPrice: true }, where: { status: 'LIVRE', createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
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
    const productIds = topProduits.map((g) => g.productId).filter((id): id is string => id != null);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, reference: true, metrage: true, category: { select: { id: true, name: true } } },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    // Construire top par catégorie : meilleur produit par catégorie (max 6 catégories)
    const topWithMeta = topProduits.filter((g) => g.productId != null).map((g) => {
      const p = productMap[g.productId as string];
      const ref = p?.reference ?? 'Inconnu';
      return {
        ref: p?.metrage != null ? `${ref} · ${p.metrage} m` : ref,
        qty: g._sum.quantity ?? 0,
        categoryId: p?.category?.id ?? null,
        categoryName: p?.category?.name ?? 'Sans catégorie',
      };
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

    // ── Ventes livrées ce mois : total + ventilation par commercial (assigné) ──
    const orderAmount = (items: { quantity: number | null; unitPrice: number | null }[]) =>
      items.reduce((acc, it) => acc + (it.quantity ?? 0) * (it.unitPrice ?? 0), 0);

    // Accumulateur par commercial : { montant, nbCommandes, nbDevis }
    const perCommercial: Record<string, { amount: number; orders: number; quotes: number }> = {};
    const bump = (uid: string | null, amount: number, kind: 'order' | 'quote') => {
      const key = uid ?? '__none__';
      if (!perCommercial[key]) perCommercial[key] = { amount: 0, orders: 0, quotes: 0 };
      perCommercial[key].amount += amount;
      if (kind === 'order') perCommercial[key].orders++; else perCommercial[key].quotes++;
    };

    let ventesMois = 0;
    ordersLivrees.forEach((o) => { const a = orderAmount(o.items); ventesMois += a; bump(o.assignedToId, a, 'order'); });
    quotesLivres.forEach((q) => { const a = q.proposedPrice ?? 0; ventesMois += a; bump(q.assignedToId, a, 'quote'); });

    const livreesMois = ordersLivrees.length;
    const devisLivresMois = quotesLivres.length;

    // Ventes mois précédent (pour l'évolution %)
    const ventesPrevMois = orderAmount(prevOrderItems) + (prevQuotesAgg._sum.proposedPrice ?? 0);
    const evolutionVentes = ventesPrevMois === 0
      ? (ventesMois > 0 ? 100 : 0)
      : Math.round(((ventesMois - ventesPrevMois) / ventesPrevMois) * 100);
    const evolutionDevis = devisPrevMois === 0
      ? (devisMois > 0 ? 100 : 0)
      : Math.round(((devisMois - devisPrevMois) / devisPrevMois) * 100);

    // Résoudre les noms des commerciaux ayant des ventes livrées
    const commercialIds = Object.keys(perCommercial).filter((k) => k !== '__none__');
    const commerciaux = commercialIds.length
      ? await prisma.user.findMany({ where: { id: { in: commercialIds } }, select: { id: true, name: true } })
      : [];
    const nameMap = Object.fromEntries(commerciaux.map((u) => [u.id, u.name]));

    // parCommercial : montant par user (pour la carte Ventes filtrable par admin)
    const parCommercial = Object.entries(perCommercial)
      .filter(([id]) => id !== '__none__')
      .map(([id, v]) => ({ id, name: nameMap[id] ?? 'Inconnu', ventes: v.amount, commandes: v.orders, devis: v.quotes }))
      .sort((a, b) => b.ventes - a.ventes);

    // Dashboard employés : nb de commandes + devis LIVRÉS gérés (pas de CA)
    const employesLivres = parCommercial
      .map((c) => ({ name: c.name, commandes: c.commandes, devis: c.devis, total: c.commandes + c.devis }))
      .sort((a, b) => b.total - a.total);

    // Objectifs du mois courant (global + par user)
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const goals = await prisma.monthlyGoal.findMany({ where: { month: monthKey } });
    const goalGlobal = goals.find((g) => g.userId == null)?.amount ?? 0;
    const goalsByUser: Record<string, number> = {};
    goals.forEach((g) => { if (g.userId) goalsByUser[g.userId] = g.amount; });

    return NextResponse.json({
      stats: {
        commandes: commandesMois,
        devisMois,                              // devis créés ce mois
        ventesMois,                             // montant des ventes livrées ce mois (total entreprise)
        ventesPrevMois,
        evolutionVentes,                        // % ventes vs mois précédent
        evolutionDevis,                         // % devis vs mois précédent
        livrees: livreesMois + devisLivresMois, // devis livré = vente (compté comme livraison)
        clients: clientsMois,
        devis: devisEnCours,
      },
      parCommercial,                            // [{ id, name, ventes, commandes, devis }] — filtre admin
      employesLivres,                           // [{ name, commandes, devis, total }] — dashboard employés
      objectifs: { global: goalGlobal, byUser: goalsByUser },
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
