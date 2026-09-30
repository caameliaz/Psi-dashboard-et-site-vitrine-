import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD — agrégats pour le dashboard
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();

    // Le serveur peut tourner en UTC alors que l'entreprise est en Algérie (UTC+1,
    // pas de changement d'heure) : calculer "aujourd'hui"/"ce mois" avec l'horloge du
    // serveur décale les bornes d'1h et fait disparaître les commandes créées juste
    // après minuit heure locale (ex: 1er du mois 00h locale = 31 23h UTC, exclu si le
    // serveur borne sur minuit UTC). On ancre donc le calcul sur l'heure d'Algérie.
    const ALGERIA_OFFSET_MS = 60 * 60 * 1000; // UTC+1
    const nowAlgeria = new Date(now.getTime() + ALGERIA_OFFSET_MS);

    // Récupérer les paramètres de date optionnels
    const startDateParam = request.nextUrl.searchParams.get('startDate');
    const endDateParam = request.nextUrl.searchParams.get('endDate');
    // Période filtrée "YYYY-MM-DD" → jour entier en heure d'Algérie (comme le graphe) :
    // avant, les bornes étaient en UTC → une vente du 1er du mois à 00:00 (Algérie)
    // = 23:00 UTC la veille tombait dans le mois précédent.
    const ymd = (v: string | null) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v ?? '');
      return m ? { y: Number(m[1]), mo: Number(m[2]) - 1, d: Number(m[3]) } : null;
    };
    const debutFiltre = ymd(startDateParam);
    const finFiltre = ymd(endDateParam);
    const hasRange = debutFiltre !== null && finFiltre !== null;
    const userIdParam = request.nextUrl.searchParams.get('userId'); // NOUVEAU: filtre par employé

    // Parser les dates ou utiliser les valeurs par défaut (mois courant)
    let startOfMonth: Date;
    let startOfToday: Date;
    let startOfPrevMonth: Date;
    let start6MonthsAgo: Date;
    let endDate: Date;

    if (hasRange) {
      // Utiliser les dates fournies (jour entier, heure d'Algérie)
      startOfMonth = new Date(Date.UTC(debutFiltre.y, debutFiltre.mo, debutFiltre.d) - ALGERIA_OFFSET_MS);
      endDate = new Date(Date.UTC(finFiltre.y, finFiltre.mo, finFiltre.d, 23, 59, 59, 999) - ALGERIA_OFFSET_MS);
      startOfToday = startOfMonth;
      // Période de comparaison (évolution %) = même durée, juste avant la période filtrée
      startOfPrevMonth = new Date(startOfMonth.getTime() - (endDate.getTime() + 1 - startOfMonth.getTime()));
      // Courbe 6 mois : les 6 mois qui finissent au mois de fin du filtre (cf. referenceKey)
      start6MonthsAgo = new Date(Date.UTC(finFiltre.y, finFiltre.mo - 5, 1) - ALGERIA_OFFSET_MS);
    } else {
      // Utiliser les valeurs par défaut (mois courant, heure d'Algérie)
      startOfMonth = new Date(Date.UTC(nowAlgeria.getUTCFullYear(), nowAlgeria.getUTCMonth(), 1) - ALGERIA_OFFSET_MS);
      endDate = new Date(Date.UTC(nowAlgeria.getUTCFullYear(), nowAlgeria.getUTCMonth() + 1, 0, 23, 59, 59, 999) - ALGERIA_OFFSET_MS);
      startOfToday = new Date(Date.UTC(nowAlgeria.getUTCFullYear(), nowAlgeria.getUTCMonth(), nowAlgeria.getUTCDate()) - ALGERIA_OFFSET_MS);
      startOfPrevMonth = new Date(Date.UTC(nowAlgeria.getUTCFullYear(), nowAlgeria.getUTCMonth() - 1, 1) - ALGERIA_OFFSET_MS);
      start6MonthsAgo = new Date(Date.UTC(nowAlgeria.getUTCFullYear(), nowAlgeria.getUTCMonth() - 5, 1) - ALGERIA_OFFSET_MS);
    }

    // Créer les filtres conditionnels pour l'employé
    const userFilter = userIdParam ? { assignedToId: userIdParam } : {};
    const orderUserWhere = userIdParam ? { assignedToId: userIdParam, status: 'LIVRE' as const } : { status: 'LIVRE' as const };
    const quoteUserWhere = userIdParam ? { assignedToId: userIdParam, status: 'LIVRE' as const } : { status: 'LIVRE' as const };

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
      topProduitsCommandes,
      topProduitsDevis,
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
      // Commandes LIVRÉES dans l'intervalle (date de livraison) — pour ventes + par commercial + employés
      prisma.order.findMany({
        where: { ...orderUserWhere, deliveredAt: { gte: startOfMonth, lte: endDate } },
        select: { assignedToId: true, items: { select: { quantity: true, unitPrice: true } } },
      }),
      // Devis LIVRÉS dans l'intervalle (date de livraison, proposedPrice + assigné)
      prisma.quote.findMany({
        where: { ...quoteUserWhere, deliveredAt: { gte: startOfMonth, lte: endDate } },
        select: { assignedToId: true, proposedPrice: true },
      }),
      // Commandes + devis livrés le MOIS PRÉCÉDENT (montant global, pour l'évolution des ventes)
      prisma.orderItem.findMany({
        where: { order: { ...orderUserWhere, deliveredAt: { gte: startOfPrevMonth, lt: startOfMonth } } },
        select: { quantity: true, unitPrice: true },
      }),
      prisma.quote.aggregate({ _sum: { proposedPrice: true }, where: { ...quoteUserWhere, deliveredAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.quote.count({ where: { status: { in: ['EN_ATTENTE', 'CONTACTE'] } } }),
      prisma.quote.aggregate({ _sum: { proposedPrice: true }, where: { status: { in: ['EN_ATTENTE', 'CONTACTE'] } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: 'EN_ATTENTE' } }),
      prisma.quote.count({ where: { status: 'EN_ATTENTE' } }),
      // Confirmés (statut VALIDE) : commandes + devis
      prisma.order.count({ where: { status: 'VALIDE' } }),
      prisma.quote.count({ where: { status: 'VALIDE' } }),
      // Top produits dans l'intervalle filtré — commandes (le top 6 est fait après fusion avec les devis)
      prisma.orderItem.groupBy({
        by: ['productId', 'description'],
        where: { order: { createdAt: { gte: startOfMonth, lte: endDate }, status: { notIn: ['ANNULE', 'RETOURNE'] } } },
        _sum: { quantity: true },
      }),
      // … et devis (ce sont aussi des ventes), mêmes règles : hors annulés / retournés
      prisma.quoteItem.groupBy({
        by: ['productId', 'description'],
        where: { quote: { createdAt: { gte: startOfMonth, lte: endDate }, status: { notIn: ['ANNULE', 'RETOURNE'] } } },
        _sum: { quantity: true },
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
        where: { ...orderUserWhere, deliveredAt: { gte: start6MonthsAgo } },
        select: { deliveredAt: true, assignedToId: true, items: { select: { quantity: true, unitPrice: true } } },
      }),
      prisma.quote.findMany({
        where: { ...quoteUserWhere, deliveredAt: { gte: start6MonthsAgo } },
        select: { deliveredAt: true, assignedToId: true, proposedPrice: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, ref: true, status: true, source: true, createdAt: true, priority: true,
          clientName: true, clientCompany: true, clientWilaya: true,
          client: { select: { name: true, company: true, wilaya: true, email: true, phones: { where: { primary: true }, select: { number: true } } } },
          items: { select: { quantity: true, unitPrice: true, product: { select: { reference: true } } } },
        },
      }),
      prisma.quote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, ref: true, status: true, source: true, message: true, proposedPrice: true, createdAt: true, priority: true,
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

    // Fusion commandes + devis, UNE PART PAR RÉFÉRENCE (le métrage est facultatif → jamais affiché
    // ni séparé : « 80/80 » reste « 80/80 » quel que soit le rouleau). Tout est renvoyé, pas seulement
    // un top 6. Lignes HORS catalogue (devis importés, ex. Moon Mobil : « 57× 69 (60 metres) ») :
    // description normalisée (× → /, métrage retiré) pour retomber sur la référence du catalogue ;
    // si cette référence n'existe pas au catalogue, la part est marquée « hors catalogue ».
    const refLibre = (d: string) =>
      d.replace(/×/g, '/').replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*m(?:[eè]tres?)?\s*\)\s*/gi, ' ')
        .replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
    const cle = (l: string) => l.toLowerCase().replace(/\s+/g, '');

    const productIds = [...new Set([...topProduitsCommandes, ...topProduitsDevis].map((g) => g.productId).filter((id): id is string => id != null))];
    const [products, catalogue] = await Promise.all([
      prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, reference: true } }),
      prisma.product.findMany({ select: { reference: true } }),
    ]);
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const refsCatalogue = new Set(catalogue.map((p) => cle(p.reference)));

    const parRef = new Map<string, { ref: string; qty: number }>();
    for (const g of [...topProduitsCommandes, ...topProduitsDevis]) {
      const ref = g.productId != null
        ? (productMap[g.productId]?.reference ?? 'Inconnu')
        : g.description?.trim() ? refLibre(g.description) : null;
      if (!ref) continue;
      const k = cle(ref);
      const cur = parRef.get(k) ?? { ref, qty: 0 };
      cur.qty += g._sum.quantity ?? 0;
      parRef.set(k, cur);
    }

    const topProduitsFinal: { ref: string; qty: number; label: string; horsCatalogue: boolean }[] =
      [...parRef.entries()].sort((a, b) => b[1].qty - a[1].qty)
        .map(([k, t]) => ({ ref: t.ref, qty: t.qty, label: t.ref, horsCatalogue: !refsCatalogue.has(k) }));

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
    // Regrouper une date par année/mois en heure d'Algérie (cf. ALGERIA_OFFSET_MS
    // plus haut) pour éviter qu'un enregistrement créé juste après minuit locale
    // ne soit classé dans le mois précédent quand le serveur tourne en UTC.
    const monthKeyAlgeria = (date: Date) => {
      const local = new Date(date.getTime() + ALGERIA_OFFSET_MS);
      return `${local.getUTCFullYear()}-${local.getUTCMonth()}`;
    };
    // Référence (année/mois en heure d'Algérie) pour construire les 6 mois : endDate
    // si un filtre est actif, sinon "maintenant" en Algérie.
    const referenceKey = hasRange ? monthKeyAlgeria(endDate) : monthKeyAlgeria(now);
    const [refYear, refMonth] = referenceKey.split('-').map(Number);
    const serie: { mois: string; commandes: number; devis: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(refYear, refMonth - i, 1));
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      serie.push({ mois: MOIS[d.getUTCMonth()], commandes: 0, devis: 0 });
      const idx = serie.length - 1;
      ordersFor6Months.forEach((o) => {
        if (monthKeyAlgeria(o.createdAt) === key) serie[idx].commandes++;
      });
      quotesFor6Months.forEach((q) => {
        if (monthKeyAlgeria(q.createdAt) === key) serie[idx].devis++;
      });
    }

    // Série 6 mois : ventes (montant) par mois de LIVRAISON
    // ventes = total ; commandes / devis = détail pour le sélecteur du graphe
    const serieVentes: { mois: string; ventes: number; commandes: number; devis: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(refYear, refMonth - i, 1));
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      serieVentes.push({ mois: MOIS[d.getUTCMonth()], ventes: 0, commandes: 0, devis: 0 });
      const idx = serieVentes.length - 1;
      ordersLivresFor6Months.forEach((o) => {
        if (o.deliveredAt && monthKeyAlgeria(o.deliveredAt) === key) {
          const montant = orderAmount(o.items);
          serieVentes[idx].ventes += montant;
          serieVentes[idx].commandes += montant;
        }
      });
      quotesLivresFor6Months.forEach((q) => {
        if (q.deliveredAt && monthKeyAlgeria(q.deliveredAt) === key) {
          serieVentes[idx].ventes += q.proposedPrice ?? 0;
          serieVentes[idx].devis += q.proposedPrice ?? 0;
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

    // Chiffre d'affaires TOTAL (toutes les ventes livrées, depuis le début) — admins seulement
    let ventesTotal: { global: number; byUser: Record<string, number> } | null = null;
    if ((session.user as { role?: string }).role === 'ADMIN') {
      const [allOrdersLivres, allQuotesLivres] = await Promise.all([
        prisma.order.findMany({ where: { status: 'LIVRE' }, select: { assignedToId: true, items: { select: { quantity: true, unitPrice: true } } } }),
        prisma.quote.findMany({ where: { status: 'LIVRE' }, select: { assignedToId: true, proposedPrice: true } }),
      ]);
      const total = { global: 0, byUser: {} as Record<string, number> };
      const add = (uid: string | null, montant: number) => {
        total.global += montant;
        if (uid) total.byUser[uid] = (total.byUser[uid] ?? 0) + montant;
      };
      allOrdersLivres.forEach((o) => add(o.assignedToId, orderAmount(o.items)));
      allQuotesLivres.forEach((q) => add(q.assignedToId, q.proposedPrice ?? 0));
      ventesTotal = total;
    }

    // Objectifs du mois courant (global + par user), heure d'Algérie
    const monthKey = `${nowAlgeria.getUTCFullYear()}-${String(nowAlgeria.getUTCMonth() + 1).padStart(2, '0')}`;
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
      ventesTotal,                              // { global, byUser } depuis le début — null si non admin
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
      serie6MoisVentes: serieVentes, // [{ mois, ventes, commandes, devis }] — montant des ventes par mois
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
