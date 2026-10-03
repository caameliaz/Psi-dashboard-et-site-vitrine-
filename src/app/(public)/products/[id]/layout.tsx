import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

// Titre de la fiche = catégorie du produit (c'est ce que la page affiche en grand), sinon titre générique.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await prisma.product.findFirst({
      where: { id, active: true, visibleOnSite: true },
      select: { category: { select: { name: true, description: true } } },
    });
    if (product?.category) {
      const { name, description } = product.category;
      return {
        title: name,
        description: description?.trim() || `${name} fabriqués par PSI. Choisissez votre format et demandez un devis ou commandez en ligne (livraison en Algérie).`,
        alternates: { canonical: `/products/${id}` },
      };
    }
  } catch { /* base indisponible : titre générique ci-dessous */ }
  return { title: 'Rouleaux thermiques', alternates: { canonical: `/products/${id}` } };
}

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
