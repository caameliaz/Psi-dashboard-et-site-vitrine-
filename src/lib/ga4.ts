// Configuration GA4
const propertyId = process.env.GA4_PROPERTY_ID ?? '';
const credentials = process.env.GA4_CREDENTIALS ? JSON.parse(process.env.GA4_CREDENTIALS) : null;

let analyticsDataClient: any | null = null;

// Palette de couleurs pour les catégories
const CATEGORY_COLORS = ['#7C6BAF', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

// Initialiser le client GA4
function getAnalyticsClient() {
  if (!analyticsDataClient && credentials) {
    try {
      // Le package sera installé séparément
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = require('@google-analytics/data');
      analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
    } catch {
      // Package non installé, retourner null
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

// Récupérer les vues de pages par catégorie pour le mois en cours
export async function getMonthlyPageViews(): Promise<{ total: number; byCategory: CategoryPageViews[] }> {
  const client = getAnalyticsClient();
  
  // Import dynamique de prisma uniquement côté serveur
  const { prisma } = await import('@/lib/prisma');
  
  // Récupérer les vraies catégories depuis la DB
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  });
  
  if (!client || !propertyId || categories.length === 0) {
    console.warn('GA4 non configuré - client, propertyId manquant ou aucune catégorie');
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
    const today = formatDate(now);
    const startDate = formatDate(startOfMonth);
    
    console.log('📊 Appel runReport mensuel:', {
      startDate,
      endDate: today,
    });
    
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate: today,
        },
      ],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
    });

    // Mapper les catégories par ID pour recherche rapide
    const categoryIds = new Set(categories.map(c => c.id));
    
    // Initialiser le map
    const byCategoryMap: Record<string, number> = {};
    categories.forEach(cat => {
      byCategoryMap[cat.id] = 0;
    });

    let total = 0;
    const allRows: Array<{ pagePath: string; views: number }> = [];
    const matchedPaths: Array<{ path: string; categoryId: string }> = [];
    const unmatchedPaths: string[] = [];
    
    // Regex pour extraire l'ID de catégorie du pagePath
    const categoryIdRegex = /\/products\/([a-zA-Z0-9]+)/;
    
    response.rows?.forEach((row: any) => {
      const pagePath = row.dimensionValues?.[0]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      
      total += views;
      allRows.push({ pagePath, views });

      // Extraire l'ID de catégorie du pagePath
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

    console.log('📊 Résultat runReport mensuel:', {
      totalSite: total,
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
    console.error('❌ Erreur GA4 runReport mensuel:', error);
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

// Récupérer les vues de pages par catégorie sur les 4 dernières semaines
export async function getWeeklyPageViews(): Promise<PageViewsByWeek[]> {
  const client = getAnalyticsClient();
  
  // Import dynamique de prisma uniquement côté serveur
  const { prisma } = await import('@/lib/prisma');
  
  // Récupérer les vraies catégories depuis la DB
  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  });
  
  if (!client || !propertyId || categories.length === 0) {
    console.warn('GA4 non configuré - client, propertyId manquant ou aucune catégorie');
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
    
    console.log('📊 Appel runReport hebdomadaire:', {
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

    // DEBUG: Afficher la structure des catégories
    console.log('📊 DEBUG categoriesDB:', {
      count: categories.length,
      sampleIds: categories.slice(0, 3).map(c => ({ id: c.id, type: typeof c.id, name: c.name })),
    });

    // Mapper les catégories par ID
    const categoryIds = new Set(categories.map(c => c.id));
    
    // Collecter les numéros de semaine ISO uniques reçus de GA4
    const weekNumbers = new Set<number>();
    response.rows?.forEach((row: any) => {
      const weekNum = parseInt(row.dimensionValues?.[0]?.value ?? '0', 10);
      if (weekNum > 0) weekNumbers.add(weekNum);
    });
    
    // Convertir en tableau trié (ordre chronologique)
    const sortedWeeks = Array.from(weekNumbers).sort((a, b) => a - b);
    
    console.log('📊 DEBUG semaines GA4:', {
      weekNumbers: Array.from(weekNumbers),
      sortedWeeks,
      note: 'Numéros ISO de semaine reçus de GA4',
    });
    
    // Mapper les semaines ISO aux labels Sem 1-4
    const weekMapping: Record<number, string> = {};
    sortedWeeks.forEach((weekNum, index) => {
      weekMapping[weekNum] = `Sem ${index + 1}`;
    });
    
    console.log('📊 DEBUG mapping semaines:', weekMapping);
    
    // Générer les labels de semaine basés sur les semaines reçues
    const weeks = sortedWeeks.map((_, index) => `Sem ${index + 1}`);
    // Compléter jusqu'à 4 semaines si nécessaire
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
    
    // Regex pour extraire l'ID de catégorie
    const categoryIdRegex = /\/products\/([a-zA-Z0-9]+)/;
    
    response.rows?.forEach((row: any) => {
      const weekNumISO = parseInt(row.dimensionValues?.[0]?.value ?? '0', 10);
      const pagePath = row.dimensionValues?.[1]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      
      // Convertir le numéro ISO en label Sem 1-4
      const weekLabel = weekMapping[weekNumISO] ?? 'Inconnu';
      
      allRows.push({ week: weekLabel, pagePath, views });

      // Extraire l'ID de catégorie du pagePath
      const match = pagePath.match(categoryIdRegex);
      
      if (!match || !match[1]) {
        unmatchedPaths.push({ week: weekLabel, path: pagePath, reason: 'Regex no match' });
        return;
      }
      
      const categoryId = match[1];
      
      // DEBUG avant la comparaison
      const isInSet = categoryIds.has(categoryId);
      if (!isInSet) {
        console.log('📊 DEBUG ID non trouvé:', {
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

    console.log('📊 Résultat runReport hebdomadaire:', {
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
    console.error('❌ Erreur GA4 runReport hebdomadaire:', error);
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
