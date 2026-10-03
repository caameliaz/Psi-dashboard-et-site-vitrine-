import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.psi.dz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Dashboard interne et API : jamais indexables, aucun intérêt SEO
      // et /admin protège déjà des données clients.
      // /cart et /checkout : volontairement ABSENTS tant que Google les a en index — ils portent un
      // « noindex » (cf. leur layout) que Google ne peut lire que s'il a le droit de les explorer.
      // Une fois disparus de Google (site:psi.dz), on peut les remettre ici.
      disallow: ['/admin', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
