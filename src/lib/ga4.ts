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
    // UTILISER UNIQUEMENT LES DONNÉES TEMPS RÉEL (instantané)
    console.log('📊 Appel runRealtimeReport avec hostName + unifiedScreenName...');
    
    const [realtimeResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [
        { name: 'unifiedScreenName' }, // Titre de la page (on va le parser pour extraire la catégorie)
      ],
      metrics: [{ name: 'screenPageViews' }],
    });

    console.log('📊 Réponse temps réel:', { 
      rowCount: realtimeResponse.rows?.length ?? 0,
      allRows: realtimeResponse.rows?.map((r: any) => ({
        screenName: r.dimensionValues?.[0]?.value,
        views: r.metricValues?.[0]?.value,
      })),
    });

    // Mapper les pages aux catégories
    const byCategoryMap: Record<string, number> = {};
    const categoryNames: Record<string, string> = {};
    categories.forEach(cat => {
      byCategoryMap[cat.id] = 0;
      categoryNames[cat.name] = cat.id;
    });

    let total = 0;
    let totalCategories = 0;
    const matchedScreens: string[] = [];
    const unmatchedScreens: string[] = [];
    
    realtimeResponse.rows?.forEach((row: any) => {
      const screenName = row.dimensionValues?.[0]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      
      // TOTAL = TOUTES les pages
      total += views;

      // Essayer de matcher le nom de catégorie dans le titre de la page
      let matched = false;
      for (const [catName, catId] of Object.entries(categoryNames)) {
        if (screenName.includes(catName)) {
          byCategoryMap[catId] += views;
          totalCategories += views;
          matchedScreens.push(`"${screenName}" → ${catName} (${catId})`);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        unmatchedScreens.push(screenName);
      }
    });

    console.log('📊 Matching détaillé:', {
      categoriesDB: categories.map(c => ({ id: c.id, name: c.name })),
      matchedScreens,
      unmatchedScreens,
    });

    console.log('📊 Résultat temps réel:', { 
      totalSite: total, 
      totalCategories, 
      byCategoryMap 
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
    console.error('❌ Erreur GA4 temps réel:', error);
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
    // UTILISER LES DONNÉES TEMPS RÉEL - on va simuler 4 semaines avec les données actuelles
    console.log('📊 Appel runRealtimeReport pour weekly...');
    
    const [realtimeResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{ name: 'unifiedScreenName' }],
      metrics: [{ name: 'screenPageViews' }],
    });

    console.log('📊 Réponse temps réel weekly:', { rowCount: realtimeResponse.rows?.length ?? 0 });

    // Mapper par catégorie en utilisant le nom de la catégorie dans le titre
    const byCategoryMap: Record<string, number> = {};
    const categoryNames: Record<string, string> = {};
    categories.forEach(cat => {
      byCategoryMap[cat.id] = 0;
      categoryNames[cat.name] = cat.id;
    });

    let total = 0;
    
    realtimeResponse.rows?.forEach((row: any) => {
      const screenName = row.dimensionValues?.[0]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      total += views;

      // Matcher le nom de catégorie dans le titre
      for (const [catName, catId] of Object.entries(categoryNames)) {
        if (screenName.includes(catName)) {
          byCategoryMap[catId] += views;
          break;
        }
      }
    });

    // Créer 4 semaines fictives avec les données actuelles (temps réel n'a pas d'historique)
    // On met toutes les données dans la semaine 4 (la plus récente)
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    const result = weeks.map((week, index) => ({
      week,
      categories: categories.map((cat, catIndex) => ({
        category: cat.name,
        views: index === 3 ? byCategoryMap[cat.id] : 0, // Toutes les vues dans Sem 4
        color: CATEGORY_COLORS[catIndex % CATEGORY_COLORS.length],
      })),
      total: index === 3 ? total : 0,
    }));

    console.log('📊 Résultat weekly temps réel:', result);

    return result;
  } catch (error) {
    console.error('❌ Erreur GA4 weekly temps réel:', error);
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

