import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.psi.dz';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Dashboard interne, API, panier/checkout : jamais indexables, aucun intérêt SEO
      // et /admin protège déjà des données clients.
      disallow: ['/admin', '/api', '/cart', '/checkout'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
