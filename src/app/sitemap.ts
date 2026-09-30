import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// www.psi.dz est le domaine canonique affiché partout sur le site (Footer, documents PDF) —
// cf. NEXT_PUBLIC_SITE_URL pour le surcharger sans toucher au code.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.psi.dz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/quote`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.5 },
  ];

  // Seuls les produits actifs ET visibles sur le site public ont une page indexable
  // (cf. src/app/api/products/route.ts, même filtre).
  const products = await prisma.product.findMany({
    where: { active: true, visibleOnSite: true },
    select: { id: true, updatedAt: true },
  });

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.id}`,
    lastModified: p.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...productRoutes];
}
