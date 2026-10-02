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
// Pays exclus de TOUS les chiffres du site public : trafic américain massif et incohérent pour un site
// algérien (robots d'indexation / services automatiques hébergés aux États-Unis). Noms GA4 (anglais).
const EXCLUDED_COUNTRIES = ['United States'];

const notCountry = {
  notExpression: {
    orGroup: {
      expressions: EXCLUDED_COUNTRIES.map((value) => ({
        filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value } },
      })),
    },
  },
};

const PUBLIC_PAGES_ONLY = {
  andGroup: {
    expressions: [
      {
        notExpression: {
          orGroup: {
            expressions: ['/admin', '/api'].map((value) => ({
              filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value } },
            })),
          },
        },
      },
      notCountry,
    ],
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

// ── Vues des catégories par semaine sur une période filtrée ────────────────────

const MOIS_COURTS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

// YYYY-MM-DD → jour calendaire (UTC, sans décalage de fuseau)
function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// « 1–7 oct », « 28 sept–4 oct » ou « 2 oct » (tranche d'un seul jour)
function bucketLabel(start: Date, end: Date): string {
  const d1 = start.getUTCDate(), d2 = end.getUTCDate();
  const m1 = MOIS_COURTS[start.getUTCMonth()], m2 = MOIS_COURTS[end.getUTCMonth()];
  if (start.getTime() === end.getTime()) return `${d1} ${m1}`;
  return m1 === m2 && start.getUTCFullYear() === end.getUTCFullYear() ? `${d1}–${d2} ${m1}` : `${d1} ${m1}–${d2} ${m2}`;
}

// Pages vues des CATÉGORIES du catalogue par semaine sur une période choisie avec « Filtrer »
// [startDate, endDate]. Mois entier → toutes ses semaines (à venir = vides) ; période libre → tranches de 7 jours.
async function getPageViewsByBuckets(
  range?: { startDate: string; endDate: string },
): Promise<PageViewsByWeek[]> {
  const client = getAnalyticsClient();

  // Import dynamique de prisma uniquement cote serveur
  const { prisma } = await import('@/lib/prisma');

  const categories = await prisma.category.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  });

  // Même période que getMonthlyPageViews (début du mois → aujourd'hui, en UTC)
  const now = new Date();
  const startIso = range?.startDate ?? formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const endIso = range?.endDate ?? formatDate(now);

  const startDay = parseIsoDay(startIso);
  const endDay = parseIsoDay(endIso);
  const DAY = 86_400_000;

  // Période = un mois calendaire (du 1er, mois en cours ou mois choisi) : on affiche TOUTES les semaines
  // du mois (Sem 1 = 1–7, Sem 2 = 8–14… dernière tranche = jours restants), même celles pas encore
  // passées (colonnes vides). Autre période libre : tranches de 7 jours (14/30 si très longue) jusqu'à
  // la date de fin.
  const monthAligned = startDay.getUTCDate() === 1
    && startDay.getUTCMonth() === endDay.getUTCMonth()
    && startDay.getUTCFullYear() === endDay.getUTCFullYear();
  const layoutEnd = monthAligned
    ? new Date(Date.UTC(startDay.getUTCFullYear(), startDay.getUTCMonth() + 1, 0)) // dernier jour du mois
    : endDay;
  const nbDays = Math.max(1, Math.round((layoutEnd.getTime() - startDay.getTime()) / DAY) + 1);
  const bucketDays = monthAligned || nbDays <= 35 ? 7 : nbDays <= 120 ? 14 : 30;

  // Tranches contiguës [début, fin] couvrant toute la période
  const buckets: { label: string; startMs: number; endMs: number }[] = [];
  for (let t = startDay.getTime(); t <= layoutEnd.getTime(); t += bucketDays * DAY) {
    const e = Math.min(t + (bucketDays - 1) * DAY, layoutEnd.getTime());
    // Tranches de 7 jours → « Sem N » (semaine N de la période) ; tranches de 14/30 jours → dates
    const label = bucketDays === 7 ? `Sem ${buckets.length + 1}` : bucketLabel(new Date(t), new Date(e));
    buckets.push({ label, startMs: t, endMs: e });
  }

  // views[indexTranche][categoryId] → structure de réponse (une barre empilée par catégorie)
  const toResult = (views: Record<string, number>[]): PageViewsByWeek[] =>
    buckets.map((b, i) => ({
      week: b.label,
      categories: categories.map((cat, index) => ({
        category: cat.name,
        views: views[i]?.[cat.id] ?? 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      })),
      total: Object.values(views[i] ?? {}).reduce((a, b) => a + b, 0),
    }));

  if (!client || !propertyId || categories.length === 0) {
    console.warn('GA4 non configure - client, propertyId manquant ou aucune categorie');
    return toResult([]);
  }

  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: startIso, endDate: endIso }],
      dimensions: [{ name: 'date' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: PUBLIC_PAGES_ONLY,
      limit: 100000,
    });

    const categoryIds = new Set(categories.map((c) => c.id));
    const categoryIdRegex = /\/products\/([a-zA-Z0-9]+)/;
    const views: Record<string, number>[] = buckets.map(() => ({}));

    response.rows?.forEach((row: GaRow) => {
      const dateStr = row.dimensionValues?.[0]?.value ?? ''; // YYYYMMDD
      const pagePath = row.dimensionValues?.[1]?.value ?? '';
      const n = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      const match = pagePath.match(categoryIdRegex);
      if (!match || !categoryIds.has(match[1]) || dateStr.length !== 8) return;

      const dayMs = Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(4, 6) - 1, +dateStr.slice(6, 8));
      const idx = buckets.findIndex((b) => dayMs >= b.startMs && dayMs <= b.endMs);
      if (idx < 0) return;
      views[idx][match[1]] = (views[idx][match[1]] ?? 0) + n;
    });

    return toResult(views);
  } catch (error) {
    console.error('[GA4] Erreur runReport vues par semaine:', error);
    return toResult([]);
  }
}

// Pages vues des catégories par SEMAINE DU MOIS : mois civil en cours par défaut (Sem 1 = jours 1–7,
// Sem 2 = 8–14, Sem 3 = 15–21, Sem 4 = 22–28, Sem 5 = jours restants s'il y en a). Les semaines pas encore
// passées restent vides. Avec « Filtrer », c'est la période choisie (cf. getPageViewsByBuckets).
export async function getWeeklyPageViews(
  range?: { startDate: string; endDate: string },
): Promise<PageViewsByWeek[]> {
  if (range) return getPageViewsByBuckets(range);
  const now = new Date();
  return getPageViewsByBuckets({
    startDate: formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    endDate: formatDate(now),
  });
}

// ── Visites par mois (graphique de la fenêtre « Site public ») ─────────────────

// Premier mois affiché : les chiffres d'avant n'étaient pas fiables (suivi imprécis).
export const MONTHLY_CHART_SINCE = '2026-09-01';

export interface MonthlyVisit {
  month: string;   // YYYY-MM
  label: string;   // « sept 2026 »
  visits: number;  // sessions
}

// Visites (sessions) PAR MOIS du site public (hors admin/API), de MONTHLY_CHART_SINCE à aujourd'hui.
// Tous les mois de la plage sont renvoyés, y compris ceux sans visite (0). null = GA4 indisponible.
export async function getMonthlyVisits(): Promise<MonthlyVisit[] | null> {
  const client = getAnalyticsClient();
  if (!client || !propertyId) return null;

  const now = new Date();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: MONTHLY_CHART_SINCE, endDate: formatDate(now) }],
    dimensions: [{ name: 'yearMonth' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: PUBLIC_PAGES_ONLY,
  });

  const byMonth = new Map<string, number>();
  response.rows?.forEach((row: GaRow) => {
    const ym = row.dimensionValues?.[0]?.value ?? ''; // YYYYMM
    if (ym.length !== 6) return;
    byMonth.set(`${ym.slice(0, 4)}-${ym.slice(4, 6)}`, parseInt(row.metricValues?.[0]?.value ?? '0', 10));
  });

  const out: MonthlyVisit[] = [];
  const first = parseIsoDay(MONTHLY_CHART_SINCE);
  let y = first.getUTCFullYear();
  let m = first.getUTCMonth();
  while (y < now.getUTCFullYear() || (y === now.getUTCFullYear() && m <= now.getUTCMonth())) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    out.push({ month: key, label: `${MOIS_COURTS[m]} ${y}`, visits: byMonth.get(key) ?? 0 });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

// ── Pays des visiteurs (bloc « Pays » de la fenêtre, période propre) ───────────

// Visites (sessions) par PAYS sur [startDate, endDate], top 15, noms en français. Pays déduit par GA4
// de l'adresse IP (fiable, sauf VPN/proxy). Les pays de EXCLUDED_COUNTRIES sont déjà retirés (cf. filtre).
// null = GA4 indisponible.
export async function getCountryVisits(
  range: { startDate: string; endDate: string },
): Promise<{ country: string; visits: number }[] | null> {
  const client = getAnalyticsClient();
  if (!client || !propertyId) return null;

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: range.startDate, endDate: range.endDate }],
    // country + code ISO (pour nommer le pays en français)
    dimensions: [{ name: 'country' }, { name: 'countryId' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: PUBLIC_PAGES_ONLY,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 16, // +1 : "(not set)" est retiré ensuite
  });

  const out: { country: string; visits: number }[] = [];
  ((response.rows ?? []) as GaRow[]).forEach((row) => {
    const gaName = row.dimensionValues?.[0]?.value ?? '';
    const code = row.dimensionValues?.[1]?.value ?? '';
    if (!gaName || gaName === '(not set)') return;
    let name = gaName;
    try { name = (code && new Intl.DisplayNames(['fr'], { type: 'region' }).of(code.toUpperCase())) || gaName; } catch { /* nom GA4 anglais */ }
    out.push({ country: name, visits: parseInt(row.metricValues?.[0]?.value ?? '0', 10) });
  });
  return out.slice(0, 15);
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
  products: { name: string; views: number }[] | null;
}

// Clics WhatsApp et produits consultés sur la période (mois en cours par défaut).
// Chaque bloc est indépendant : si l'un échoue, les autres sont quand même renvoyés.
export async function getSiteDetails(range?: { startDate: string; endDate: string }): Promise<SiteDetails> {
  const client = getAnalyticsClient();
  if (!client || !propertyId) return { whatsappClicks: null, products: null };

  const now = new Date();
  const dateRanges = [{
    startDate: range?.startDate ?? formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    endDate: range?.endDate ?? formatDate(now),
  }];
  const property = `properties/${propertyId}`;
  const num = (v: string | null | undefined) => parseInt(v ?? '0', 10);

  const [whatsapp, products] = await Promise.allSettled([
    // Clics WhatsApp, deux sources :
    // - `click` : clic sortant enregistré automatiquement par GA4 (mesures améliorées,
    //   actives par défaut) → contient l'HISTORIQUE, filtré sur le domaine du lien ;
    // - `whatsapp_click` : notre événement (GoogleAnalytics.tsx), depuis son déploiement.
    client.runReport({
      property, dateRanges,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      // Hors pages admin : avant, le tag GA y tournait aussi, et les liens WhatsApp de
      // l'admin (fiche client, demandes…) = l'équipe qui contacte un client, pas un visiteur.
      dimensionFilter: {
        andGroup: {
          expressions: [
            PUBLIC_PAGES_ONLY,
            {
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
          ],
        },
      },
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
  const productRows = rows(products, 'produits');

  return {
    // Depuis le déploiement, un même clic déclenche les DEUX événements : on prend le
    // plus grand (et pas la somme) pour ne pas compter deux fois. Avant, seul `click` existe.
    whatsappClicks: whatsappRows === null ? null : Math.max(0, ...whatsappRows.map((row) => num(row.metricValues?.[0]?.value))),
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
      client.runRealtimeReport({ property, metrics: [{ name: 'activeUsers' }], dimensionFilter: notCountry }),
      client.runRealtimeReport({ property, dimensions: [{ name: 'minutesAgo' }], metrics: [{ name: 'activeUsers' }], dimensionFilter: notCountry }),
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
