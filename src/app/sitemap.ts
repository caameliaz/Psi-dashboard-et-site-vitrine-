import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { LOCALES, localePath } from '@/lib/i18n/config';

// www.psi.dz est le domaine canonique affiché partout sur le site (Footer, documents PDF) —
// cf. NEXT_PUBLIC_SITE_URL pour le surcharger sans toucher au code.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.psi.dz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Chaque page existe en français (sans préfixe), en anglais (/en) et en arabe (/ar) : une entrée par
  // langue, chacune déclarant les 2 autres versions (hreflang) pour que Google les relie.
  const entry = (path: string, changeFrequency: 'weekly' | 'monthly' | 'yearly', priority: number, lastModified?: Date): MetadataRoute.Sitemap =>
    LOCALES.map((lang) => ({
      url: `${SITE_URL}${localePath(path, lang)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency,
      priority,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}${localePath(path, l)}`])) },
    }));

  const staticRoutes: MetadataRoute.Sitemap = [
    ...entry('/', 'weekly', 1),
    ...entry('/products', 'weekly', 0.9),
    ...entry('/quote', 'monthly', 0.8),
    ...entry('/contact', 'yearly', 0.5),
  ];

  // Seuls les produits actifs ET visibles sur le site public ont une page indexable
  // (cf. src/app/api/products/route.ts, même filtre).
  const products = await prisma.product.findMany({
    where: { active: true, visibleOnSite: true },
    select: { id: true, updatedAt: true },
  });

  const productRoutes: MetadataRoute.Sitemap = products.flatMap((p) => entry(`/products/${p.id}`, 'monthly', 0.7, p.updatedAt));

  return [...staticRoutes, ...productRoutes];
}
