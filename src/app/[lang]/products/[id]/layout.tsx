import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { isLang } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/server';
import { localizedMetadata } from '@/lib/i18n/seo';
import { loadStore, localizeCategory } from '@/lib/i18n/translations';
import { isTrLang } from '@/lib/i18n/translations-shared';

// Titre de la fiche = catégorie du produit (c'est ce que la page affiche en grand), sinon titre générique.
// Nom et description : ceux de la base (français) ou leur traduction ; à défaut, une phrase de secours traduite.
export async function generateMetadata({ params }: { params: Promise<{ lang: string; id: string }> }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLang(lang)) return {};
  const m = getDict(lang).meta;
  const path = `/products/${id}`;
  try {
    const product = await prisma.product.findFirst({
      where: { id, active: true, visibleOnSite: true },
      select: { category: { select: { id: true, name: true, description: true } } },
    });
    if (product?.category) {
      // Nom et description dans la langue de la page (traductions saisies depuis le dashboard)
      const { name, description } = isTrLang(lang) ? localizeCategory(product.category, await loadStore(), lang) : product.category;
      return localizedMetadata(lang, path, { title: name, description: description?.trim() || m.product_desc.replace('{name}', name), absoluteTitle: true });
    }
  } catch { /* base indisponible : titre générique ci-dessous */ }
  return localizedMetadata(lang, path, { title: m.product_title, absoluteTitle: true });
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
