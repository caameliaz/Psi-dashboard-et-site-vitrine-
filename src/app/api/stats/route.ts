import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — agrégats pour le dashboard
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();
    
    // Récupérer les paramètres de date optionnels
    const startDateParam = request.nextUrl.searchParams.get('startDate');
    const endDateParam = request.nextUrl.searchParams.get('endDate');
    const userIdParam = request.nextUrl.searchParams.get('userId'); // NOUVEAU: filtre par employé
    
    // Parser les dates ou utiliser les valeurs par défaut (mois courant)
    let startOfMonth: Date;
    let startOfToday: Date;
    let startOfPrevMonth: Date;
    let start6MonthsAgo: Date;
    let endDate: Date;
    
    if (startDateParam && endDateParam) {
      // Utiliser les dates fournies
      startOfMonth = new Date(startDateParam);
      startOfMonth.setHours(0, 0, 0, 0);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
      startOfToday = startOfMonth;
      startOfPrevMonth = new Date(startOfMonth);
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
      start6MonthsAgo = new Date(startOfMonth);
      start6MonthsAgo.setMonth(start6MonthsAgo.getMonth() - 5);
    } else {
      // Utiliser les valeurs par défaut (mois courant)
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start6MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }

    // Créer les filtres conditionnels pour l'employé
    const userFilter = userIdParam ? { assignedToId: userIdParam } : {};
    const orderUserWhere = userIdParam ? { assignedToId: userIdParam, status: 'LIVRE' } : { status: 'LIVRE' };
    const quoteUserWhere = userIdParam ? { assignedToId: userIdParam, status: 'LIVRE' } : { status: 'LIVRE' };

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
      confirmesCommandes,
      confirmesDevis,
      topProduits,
      sourceOrders,
      sourceQuotes,
      ordersByWilaya,
      ordersFor6Months,
      quotesFor6Months,
      ordersLivresFor6Months,
      quotesLivresFor6Months,
      recentOrders,
      recentQuotes,
      // Devis ce mois par produit (pour taux de conversion)
      quotesThisMonth,
      quotesDeliveredThisMonth,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfMonth, lte: endDate } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      prisma.quote.count({ where: { createdAt: { gte: startOfMonth, lte: endDate } } }),
      prisma.quote.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      // Commandes LIVRÉES dans l'intervalle (montant via items + assigné) — pour ventes + par commercial + employés
      prisma.order.findMany({
        where: { ...orderUserWhere, createdAt: { gte: startOfMonth, lte: endDate } },
        select: { assignedToId: true, items: { select: { quantity: true, unitPrice: true } } },
      }),
      // Devis LIVRÉS dans l'intervalle (proposedPrice + assigné)
      prisma.quote.findMany({
        where: { ...quoteUserWhere, createdAt: { gte: startOfMonth, lte: endDate } },
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
      // Confirmés (statut VALIDE) : commandes + devis
      prisma.order.count({ where: { status: 'VALIDE' } }),
      prisma.quote.count({ where: { status: 'VALIDE' } }),
      // Top produits dans l'intervalle filtré
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: startOfMonth, lte: endDate } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 6,
      }),
      prisma.order.groupBy({ by: ['source'], _count: { id: true } }),
      prisma.quote.groupBy({ by: ['source'], _count: { id: true } }),
      // Commandes par wilaya (snapshot clientWilaya, fallback géré côté résolution) - avec filtrage par date
      prisma.order.groupBy({ 
        by: ['clientWilaya'], 
        where: { createdAt: { gte: startOfMonth, lte: endDate } },
        _count: { id: true }, 
        orderBy: { _count: { id: 'desc' } }, 
        take: 10 
      }),
      // Commandes des 6 derniers mois (pour la courbe)
      prisma.order.findMany({ where: { createdAt: { gte: start6MonthsAgo } }, select: { createdAt: true } }),
      prisma.quote.findMany({ where: { createdAt: { gte: start6MonthsAgo } }, select: { createdAt: true } }),
      // Ventes livrées des 6 derniers mois (pour la courbe des ventes)
      prisma.order.findMany({
        where: { ...orderUserWhere, createdAt: { gte: start6MonthsAgo } },
        select: { createdAt: true, items: { select: { quantity: true, unitPrice: true } } },
      }),
      prisma.quote.findMany({
        where: { ...quoteUserWhere, createdAt: { gte: start6MonthsAgo } },
        select: { createdAt: true, proposedPrice: true },
      }),
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
      // Devis créés dans l'intervalle avec items
      prisma.quote.findMany({
        where: { createdAt: { gte: startOfMonth, lte: endDate } },
        select: { items: { select: { productId: true, description: true } } },
      }),
      // Devis livrés dans l'intervalle avec items
      prisma.quote.findMany({
        where: { status: 'LIVRE', createdAt: { gte: startOfMonth, lte: endDate } },
        select: { items: { select: { productId: true, description: true } } },
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

    // Helper pour calculer le montant d'une commande
    const orderAmount = (items: { quantity: number | null; unitPrice: number | null }[]) =>
      items.reduce((acc, it) => acc + (it.quantity ?? 0) * (it.unitPrice ?? 0), 0);

    // Série 6 mois : commandes + devis par mois (labels courts)
    const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    // Utiliser endDate comme référence pour supporter le filtrage
    const referenceDate = startDateParam && endDateParam ? endDate : now;
    const serie: { mois: string; commandes: number; devis: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
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

    // Série 6 mois : ventes (montant) par mois
    const serieVentes: { mois: string; ventes: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      serieVentes.push({ mois: MOIS[d.getMonth()], ventes: 0 });
      const idx = serieVentes.length - 1;
      ordersLivresFor6Months.forEach((o) => {
        const od = new Date(o.createdAt);
        if (`${od.getFullYear()}-${od.getMonth()}` === key) {
          serieVentes[idx].ventes += orderAmount(o.items);
        }
      });
      quotesLivresFor6Months.forEach((q) => {
        const qd = new Date(q.createdAt);
        if (`${qd.getFullYear()}-${qd.getMonth()}` === key) {
          serieVentes[idx].ventes += q.proposedPrice ?? 0;
        }
      });
    }

    // ── Ventes livrées ce mois : total + ventilation par commercial (assigné) ──

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

    // Taux de conversion des devis par produit (ce mois)
    const quotesByProduct: Record<string, { total: number; delivered: number; label: string }> = {};
    
    // Compter les devis créés par produit
    quotesThisMonth.forEach((q) => {
      q.items.forEach((item) => {
        // Utiliser productId si disponible, sinon description pour produits personnalisés
        const key = item.productId || `custom_${item.description || 'Produit personnalisé'}`;
        if (!quotesByProduct[key]) {
          quotesByProduct[key] = { 
            total: 0, 
            delivered: 0,
            label: item.productId ? '' : (item.description || 'Produit personnalisé')
          };
        }
        quotesByProduct[key].total++;
      });
    });
    
    // Compter les devis livrés par produit
    quotesDeliveredThisMonth.forEach((q) => {
      q.items.forEach((item) => {
        const key = item.productId || `custom_${item.description || 'Produit personnalisé'}`;
        if (quotesByProduct[key]) {
          quotesByProduct[key].delivered++;
        }
      });
    });

    // Calculer le taux de conversion par produit
    const conversionData = await Promise.all(
      Object.entries(quotesByProduct)
        .filter(([_, data]) => data.total > 0) // Au moins 1 devis créé
        .map(async ([key, data]) => {
          let label: string;
          let reference: string;
          
          // Vérifier si c'est un produit du catalogue ou personnalisé
          if (key.startsWith('custom_')) {
            // Produit personnalisé
            label = data.label;
            reference = 'Personnalisé';
          } else {
            // Produit du catalogue
            const product = await prisma.product.findUnique({
              where: { id: key },
              select: { reference: true, name: true, metrage: true },
            });
            reference = product?.reference ?? 'Inconnu';
            label = product?.metrage ? `${product.reference} · ${product.metrage}m` : (product?.name ?? product?.reference ?? 'Inconnu');
          }
          
          // Si aucun devis livré, le taux sera 0%
          const rate = data.delivered > 0 ? Math.round((data.delivered / data.total) * 100) : 0;
          return {
            productId: key,
            reference,
            label,
            rate,
            total: data.total,
            delivered: data.delivered,
          };
        })
    );

    // Trier par taux de conversion décroissant et prendre les 6 premiers
    const conversionRates = conversionData
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 6);

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
        confirmes: confirmesCommandes + confirmesDevis,
      },
      // Nouvelles stats (P2)
      evolutionCommandes,        // % vs mois précédent
      commandesPrevMois,
      devisEnAttente: { count: attenteDevis, montant: devisEnAttenteAgg._sum.proposedPrice ?? 0 },
      topWilayas,                // [{ wilaya, count }]
      serie6Mois: serie,         // [{ mois, commandes, devis }]
      serie6MoisVentes: serieVentes, // [{ mois, ventes }] — montant des ventes par mois
      conversionRates,           // [{ productId, reference, label, rate, total, delivered }] — taux de conversion par produit
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
