// Configuration GA4
const propertyId = process.env.GA4_PROPERTY_ID ?? '';
const credentials = process.env.GA4_CREDENTIALS ? JSON.parse(process.env.GA4_CREDENTIALS) : null;

let analyticsDataClient: any | null = null;

// Palette de couleurs pour les categories
const CATEGORY_COLORS = ['#7C6BAF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

// Initialiser le client GA4
function getAnalyticsClient() {
  if (!analyticsDataClient && credentials) {
    try {
      // Le package sera installe separement
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = require('@google-analytics/data');
      analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
    } catch {
      // Package non installe, retourner null
      return null;
    }
  }
  return analyticsDataClient;
}

export interface CategoryPageViews {
  category: string;
  views: number;
  color: string;
}

export interface PageViewsByWeek {
  week: string;
  categories: CategoryPageViews[];
  total: number;
}

// Formater une date en YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Période ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD d'une requête (undefined = mois en cours)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function rangeFromSearchParams(params: URLSearchParams): { startDate: string; endDate: string } | undefined {
  const startDate = params.get('startDate')?.slice(0, 10);
  const endDate = params.get('endDate')?.slice(0, 10);
  return startDate && endDate && ISO_DATE.test(startDate) && ISO_DATE.test(endDate) ? { startDate, endDate } : undefined;
}

// Exclut les pages admin/API : avant, le tag GA etait charge sur tout le site
// et chaque clic de l'equipe dans l'admin etait compte comme une visite.
const PUBLIC_PAGES_ONLY = {
  notExpression: {
    orGroup: {
      expressions: ['/admin', '/api'].map((value) => ({
        filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value } },
      })),
    },
  },
};

// Recuperer les visites (sessions) et les vues par categorie pour le mois en cours,
// ou pour la periode [startDate, endDate] (YYYY-MM-DD) si fournie.
export async function getMonthlyPageViews(
  range?: { startDate: string; endDate: string },
): Promise<{ total: number; byCategory: CategoryPageViews[] }> {
  const client = getAnalyticsClient();
  
  // Import dynamique de prisma uniquement cote serveur
  const { prisma } = await import('@/lib/prisma');
  
  // Recuperer les vraies categories depuis la DB
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  });
  
  if (!client || !propertyId || categories.length === 0) {
    console.warn('GA4 non configure - client, propertyId manquant ou aucune categorie');
    return {
      total: 0,
      byCategory: categories.map((cat, index) => ({
        category: cat.name,
        views: 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
    };
  }

  try {
    // Utiliser runReport avec pagePath
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const today = range?.endDate ?? formatDate(now);
    const startDate = range?.startDate ?? formatDate(startOfMonth);

    console.log('[GA4] Appel runReport mensuel:', {
      startDate,
      endDate: today,
    });

    const [[response], [sessionsResponse]] = await Promise.all([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate: today }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: PUBLIC_PAGES_ONLY,
      }),
      // Total = nombre de visites (sessions), pas de pages vues :
      // un visiteur qui ouvre 10 pages compte pour 1 visite.
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate, endDate: today }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: PUBLIC_PAGES_ONLY,
      }),
    ]);

    // Mapper les categories par ID pour recherche rapide
    const categoryIds = new Set(categories.map(c => c.id));
    
    // Initialiser le map
    const byCategoryMap: Record<string, number> = {};
    categories.forEach(cat => {
      byCategoryMap[cat.id] = 0;
    });

    let totalPageViews = 0;
    const total = parseInt(sessionsResponse.rows?.[0]?.metricValues?.[0]?.value ?? '0', 10);
    const allRows: Array<{ pagePath: string; views: number }> = [];
    const matchedPaths: Array<{ path: string; categoryId: string }> = [];
    const unmatchedPaths: string[] = [];
    
    // Regex pour extraire l'ID de categorie du pagePath
    const categoryIdRegex = /\/products\/([a-zA-Z0-9]+)/;
    
    response.rows?.forEach((row: any) => {
      const pagePath = row.dimensionValues?.[0]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      
      totalPageViews += views;
      allRows.push({ pagePath, views });

      // Extraire l'ID de categorie du pagePath
      const match = pagePath.match(categoryIdRegex);
      if (match && match[1]) {
        const categoryId = match[1];
        if (categoryIds.has(categoryId)) {
          byCategoryMap[categoryId] += views;
          matchedPaths.push({ path: pagePath, categoryId });
        } else {
          unmatchedPaths.push(pagePath);
        }
      } else {
        unmatchedPaths.push(pagePath);
      }
    });

    console.log('[GA4] Resultat runReport mensuel:', {
      sessions: total,
      totalPageViews,
      totalCategories: Object.values(byCategoryMap).reduce((a, b) => a + b, 0),
      byCategoryMap,
      allRows: allRows.slice(0, 5),
      matchedPaths: matchedPaths.slice(0, 5),
      unmatchedPaths: unmatchedPaths.slice(0, 5),
    });

    return {
      total,
      byCategory: categories.map((cat, index) => ({
        category: cat.name,
        views: byCategoryMap[cat.id],
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
    };
  } catch (error) {
    console.error('[GA4] Erreur runReport mensuel:', error);
    return {
      total: 0,
      byCategory: categories.map((cat, index) => ({
        category: cat.name,
        views: 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
    };
  }
}

// Recuperer les vues de pages par categorie sur les 4 dernieres semaines
export async function getWeeklyPageViews(): Promise<PageViewsByWeek[]> {
  const client = getAnalyticsClient();
  
  // Import dynamique de prisma uniquement cote serveur
  const { prisma } = await import('@/lib/prisma');
  
  // Recuperer les vraies categories depuis la DB
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  });
  
  if (!client || !propertyId || categories.length === 0) {
    console.warn('GA4 non configure - client, propertyId manquant ou aucune categorie');
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    return weeks.map((week) => ({
      week,
      categories: categories.map((cat, index) => ({
        category: cat.name,
        views: 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
      total: 0,
    }));
  }

  try {
    // Utiliser runReport avec week et pagePath
    const today = formatDate(new Date());
    
    console.log('[GA4] Appel runReport hebdomadaire:', {
      startDate: '28daysAgo',
      endDate: today,
    });
    
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '28daysAgo',
          endDate: today,
        },
      ],
      dimensions: [
        { name: 'week' },
        { name: 'pagePath' },
      ],
      metrics: [{ name: 'screenPageViews' }],
    });

    // DEBUG: Afficher la structure des categories
    console.log('[GA4] DEBUG categoriesDB:', {
      count: categories.length,
      sampleIds: categories.slice(0, 3).map(c => ({ id: c.id, type: typeof c.id, name: c.name })),
    });

    // Mapper les categories par ID
    const categoryIds = new Set(categories.map(c => c.id));
    
    // Collecter les numeros de semaine ISO uniques recus de GA4
    const weekNumbers = new Set<number>();
    response.rows?.forEach((row: any) => {
      const weekNum = parseInt(row.dimensionValues?.[0]?.value ?? '0', 10);
      if (weekNum > 0) weekNumbers.add(weekNum);
    });
    
    // Convertir en tableau trie (ordre chronologique)
    const sortedWeeks = Array.from(weekNumbers).sort((a, b) => a - b);
    
    console.log('[GA4] DEBUG semaines GA4:', {
      weekNumbers: Array.from(weekNumbers),
      sortedWeeks,
      note: 'Numeros ISO de semaine recus de GA4',
    });
    
    // Mapper les semaines ISO aux labels Sem 1-4
    const weekMapping: Record<number, string> = {};
    sortedWeeks.forEach((weekNum, index) => {
      weekMapping[weekNum] = `Sem ${index + 1}`;
    });
    
    console.log('[GA4] DEBUG mapping semaines:', weekMapping);
    
    // Generer les labels de semaine bases sur les semaines recues
    const weeks = sortedWeeks.map((_, index) => `Sem ${index + 1}`);
    // Completer jusqu'a 4 semaines si necessaire
    while (weeks.length < 4) {
      weeks.unshift(`Sem ${weeks.length + 1}`);
    }
    
    // Initialiser la structure par semaine
    const byWeekAndCategory: Record<string, Record<string, number>> = {};
    
    weeks.forEach(week => {
      byWeekAndCategory[week] = {};
      categories.forEach(cat => {
        byWeekAndCategory[week][cat.id] = 0;
      });
    });

    const allRows: Array<{ week: string; pagePath: string; views: number }> = [];
    const matchedPaths: Array<{ week: string; path: string; categoryId: string }> = [];
    const unmatchedPaths: Array<{ week: string; path: string; reason: string }> = [];
    
    // Regex pour extraire l'ID de categorie
    const categoryIdRegex = /\/products\/([a-zA-Z0-9]+)/;
    
    response.rows?.forEach((row: any) => {
      const weekNumISO = parseInt(row.dimensionValues?.[0]?.value ?? '0', 10);
      const pagePath = row.dimensionValues?.[1]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      
      // Convertir le numero ISO en label Sem 1-4
      const weekLabel = weekMapping[weekNumISO] ?? 'Inconnu';
      
      allRows.push({ week: weekLabel, pagePath, views });

      // Extraire l'ID de categorie du pagePath
      const match = pagePath.match(categoryIdRegex);
      
      if (!match || !match[1]) {
        unmatchedPaths.push({ week: weekLabel, path: pagePath, reason: 'Regex no match' });
        return;
      }
      
      const categoryId = match[1];
      
      // DEBUG avant la comparaison
      const isInSet = categoryIds.has(categoryId);
      if (!isInSet) {
        console.log('[GA4] DEBUG ID non trouve:', {
          extractedId: categoryId,
          extractedIdType: typeof categoryId,
          categoryIdsArray: Array.from(categoryIds).slice(0, 3),
          categoryIdsTypes: Array.from(categoryIds).slice(0, 3).map(id => typeof id),
          isInSet,
        });
      }
      
      if (categoryIds.has(categoryId) && byWeekAndCategory[weekLabel]) {
        byWeekAndCategory[weekLabel][categoryId] += views;
        matchedPaths.push({ week: weekLabel, path: pagePath, categoryId });
      } else {
        unmatchedPaths.push({ 
          week: weekLabel, 
          path: pagePath, 
          reason: !categoryIds.has(categoryId) ? 'ID not in DB' : 'Week label invalid' 
        });
      }
    });

    console.log('[GA4] Resultat runReport hebdomadaire:', {
      allRows: allRows.slice(0, 5),
      matchedPaths: matchedPaths.slice(0, 5),
      unmatchedPaths: unmatchedPaths.slice(0, 5),
      byWeekAndCategory,
    });

    return weeks.map((week) => ({
      week,
      categories: categories.map((cat, index) => ({
        category: cat.name,
        views: byWeekAndCategory[week]?.[cat.id] ?? 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
      total: Object.values(byWeekAndCategory[week] ?? {}).reduce((a, b) => a + b, 0),
    }));
  } catch (error) {
    console.error('[GA4] Erreur runReport hebdomadaire:', error);
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    return weeks.map((week) => ({
      week,
      categories: categories.map((cat, index) => ({
        category: cat.name,
        views: 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
      total: 0,
    }));
  }
}

// ── Détail « Site public » (fenêtre du dashboard) ─────────────────────────────

// Ligne de rapport GA4 (runReport / runRealtimeReport)
type GaRow = {
  dimensionValues?: { value?: string | null }[] | null;
  metricValues?: { value?: string | null }[] | null;
};

export interface SiteDetails {
  // null = erreur GA4 sur ce bloc (les autres blocs restent affichés)
  whatsappClicks: number | null;
  cities: { city: string; visits: number }[] | null;
  products: { name: string; views: number }[] | null;
}

// Villes, clics WhatsApp et produits consultés sur la période (mois en cours par défaut).
// Chaque bloc est indépendant : si l'un échoue, les autres sont quand même renvoyés.
export async function getSiteDetails(range?: { startDate: string; endDate: string }): Promise<SiteDetails> {
  const client = getAnalyticsClient();
  if (!client || !propertyId) return { whatsappClicks: null, cities: null, products: null };

  const now = new Date();
  const dateRanges = [{
    startDate: range?.startDate ?? formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    endDate: range?.endDate ?? formatDate(now),
  }];
  const property = `properties/${propertyId}`;
  const num = (v: string | null | undefined) => parseInt(v ?? '0', 10);

  const [whatsapp, cities, products] = await Promise.allSettled([
    // Clics WhatsApp, deux sources :
    // - `click` : clic sortant enregistré automatiquement par GA4 (mesures améliorées,
    //   actives par défaut) → contient l'HISTORIQUE, filtré sur le domaine du lien ;
    // - `whatsapp_click` : notre événement (GoogleAnalytics.tsx), depuis son déploiement.
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'whatsapp_click' } } },
            {
              andGroup: {
                expressions: [
                  { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'click' } } },
                  {
                    orGroup: {
                      expressions: ['wa.me', 'whatsapp'].map((value) => ({
                        filter: { fieldName: 'linkDomain', stringFilter: { matchType: 'CONTAINS', value, caseSensitive: false } },
                      })),
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    }),
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'city' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: PUBLIC_PAGES_ONLY,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 11, // +1 : "(not set)" est retiré ensuite
    }),
    // Événement standard view_item envoyé quand un visiteur choisit une référence
    // dans une catégorie (products/[id]) — lisible par l'API sans dimension personnalisée
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'itemName' }],
      metrics: [{ name: 'itemsViewed' }],
      orderBys: [{ metric: { metricName: 'itemsViewed' }, desc: true }],
      limit: 10,
    }),
  ]);

  const rows = (r: PromiseSettledResult<[{ rows?: GaRow[] | null }, ...unknown[]]>, label: string) => {
    if (r.status === 'rejected') { console.error(`[GA4] Erreur détail ${label}:`, r.reason); return null; }
    return r.value?.[0]?.rows ?? [];
  };

  const whatsappRows = rows(whatsapp, 'whatsapp');
  const cityRows = rows(cities, 'villes');
  const productRows = rows(products, 'produits');

  return {
    // Depuis le déploiement, un même clic déclenche les DEUX événements : on prend le
    // plus grand (et pas la somme) pour ne pas compter deux fois. Avant, seul `click` existe.
    whatsappClicks: whatsappRows === null ? null : Math.max(0, ...whatsappRows.map((row) => num(row.metricValues?.[0]?.value))),
    cities: cityRows === null ? null : cityRows
      .map((row) => ({ city: row.dimensionValues?.[0]?.value ?? '', visits: num(row.metricValues?.[0]?.value) }))
      .filter((c) => c.city && c.city !== '(not set)')
      .slice(0, 10),
    products: productRows === null ? null : productRows
      .map((row) => ({ name: row.dimensionValues?.[0]?.value ?? '', views: num(row.metricValues?.[0]?.value) }))
      .filter((p) => p.name && p.name !== '(not set)'),
  };
}

// Visiteurs actifs sur les 30 dernières minutes (API temps réel de GA4 — quota
// séparé des rapports classiques, pas de délai de traitement).
// perMinute[29] = minute en cours, perMinute[0] = il y a 29 min. null = erreur GA4.
export async function getRealtimeVisitors(): Promise<{ now: number; perMinute: number[] } | null> {
  const client = getAnalyticsClient();
  if (!client || !propertyId) return null;
  const property = `properties/${propertyId}`;

  try {
    const [[totalRes], [minutesRes]] = await Promise.all([
      // Total sans dimension : un même visiteur actif sur plusieurs minutes compte 1 fois
      client.runRealtimeReport({ property, metrics: [{ name: 'activeUsers' }] }),
      client.runRealtimeReport({ property, dimensions: [{ name: 'minutesAgo' }], metrics: [{ name: 'activeUsers' }] }),
    ]);

    const perMinute: number[] = Array(30).fill(0);
    ((minutesRes.rows ?? []) as GaRow[]).forEach((row) => {
      const minutesAgo = parseInt(row.dimensionValues?.[0]?.value ?? '-1', 10);
      if (minutesAgo >= 0 && minutesAgo < 30) perMinute[29 - minutesAgo] = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
    });

    return { now: parseInt(totalRes.rows?.[0]?.metricValues?.[0]?.value ?? '0', 10), perMinute };
  } catch (error) {
    console.error('[GA4] Erreur temps réel:', error);
    return null;
  }
}
