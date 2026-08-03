// Configuration GA4
const propertyId = process.env.GA4_PROPERTY_ID ?? '';
const credentials = process.env.GA4_CREDENTIALS ? JSON.parse(process.env.GA4_CREDENTIALS) : null;

let analyticsDataClient: any | null = null;

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
  
  if (!client || !propertyId) {
    // Données de test si GA4 n'est pas configuré
    return {
      total: 1250,
      byCategory: [
        { category: 'Impression', views: 720, color: '#7C6BAF' },
        { category: 'Étiquettes', views: 530, color: '#EF4444' },
      ],
    };
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: 'today',
        },
      ],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
    });

    // Mapper les pages aux catégories
    const byCategory: Record<string, number> = {
      Impression: 0,
      Étiquettes: 0,
    };

    let total = 0;
    response.rows?.forEach((row: any) => {
      const path = row.dimensionValues?.[0]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      total += views;

      // Déterminer la catégorie selon le path
      if (path.includes('/impression') || path.includes('/produits/impression')) {
        byCategory.Impression += views;
      } else if (path.includes('/etiquettes') || path.includes('/produits/etiquettes')) {
        byCategory.Étiquettes += views;
      }
    });

    return {
      total,
      byCategory: [
        { category: 'Impression', views: byCategory.Impression, color: '#7C6BAF' },
        { category: 'Étiquettes', views: byCategory.Étiquettes, color: '#EF4444' },
      ],
    };
  } catch (error) {
    console.error('Erreur GA4:', error);
    // Retourner des données de test en cas d'erreur
    return {
      total: 1250,
      byCategory: [
        { category: 'Impression', views: 720, color: '#7C6BAF' },
        { category: 'Étiquettes', views: 530, color: '#EF4444' },
      ],
    };
  }
}

// Récupérer les vues de pages par catégorie sur les 4 dernières semaines
export async function getWeeklyPageViews(): Promise<PageViewsByWeek[]> {
  const client = getAnalyticsClient();
  
  if (!client || !propertyId) {
    // Données de test si GA4 n'est pas configuré
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    return weeks.map((week, i) => ({
      week,
      categories: [
        { category: 'Impression', views: 150 + i * 20, color: '#7C6BAF' },
        { category: 'Étiquettes', views: 120 + i * 15, color: '#EF4444' },
      ],
      total: 270 + i * 35,
    }));
  }

  try {
    const now = new Date();
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);
    
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: fourWeeksAgo.toISOString().split('T')[0],
          endDate: 'today',
        },
      ],
      dimensions: [{ name: 'week' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
    });

    // Grouper par semaine et catégorie
    const weeklyData: Record<string, Record<string, number>> = {};
    
    response.rows?.forEach((row: any) => {
      const week = row.dimensionValues?.[0]?.value ?? '';
      const path = row.dimensionValues?.[1]?.value ?? '';
      const views = parseInt(row.metricValues?.[0]?.value ?? '0', 10);

      if (!weeklyData[week]) {
        weeklyData[week] = { Impression: 0, Étiquettes: 0 };
      }

      if (path.includes('/impression') || path.includes('/produits/impression')) {
        weeklyData[week].Impression += views;
      } else if (path.includes('/etiquettes') || path.includes('/produits/etiquettes')) {
        weeklyData[week].Étiquettes += views;
      }
    });

    // Convertir en tableau et trier par date
    const result: PageViewsByWeek[] = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4) // Garder les 4 dernières semaines
      .map(([week, data], index) => ({
        week: `Sem ${index + 1}`,
        categories: [
          { category: 'Impression', views: data.Impression, color: '#7C6BAF' },
          { category: 'Étiquettes', views: data.Étiquettes, color: '#EF4444' },
        ],
        total: data.Impression + data.Étiquettes,
      }));

    return result.length > 0 ? result : getWeeklyPageViews(); // Fallback aux données de test
  } catch (error) {
    console.error('Erreur GA4:', error);
    // Données de test en cas d'erreur
    const weeks = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
    return weeks.map((week, i) => ({
      week,
      categories: [
        { category: 'Impression', views: 150 + i * 20, color: '#7C6BAF' },
        { category: 'Étiquettes', views: 120 + i * 15, color: '#EF4444' },
      ],
      total: 270 + i * 35,
    }));
  }
}

