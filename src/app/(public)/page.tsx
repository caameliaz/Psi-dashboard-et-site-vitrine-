import type { Metadata } from 'next';
import { HomeClient } from '@/components/HomeClient';
import type { Cat, Prod } from '@/lib/hardcodedCatalog';
import { prisma } from '@/lib/prisma';

// Fetch des données côté serveur pour performance (accès direct DB)
async function getContent() {
  try {
    const items = await prisma.siteContent.findMany();
    return Object.fromEntries(items.map(i => [i.key, i.value]));
  } catch {
    return {};
  }
}

// Accueil : titre complet (sans le suffixe du modèle) + adresse canonique
export const metadata: Metadata = {
  title: { absolute: 'Rouleaux thermiques TPE et caisses enregistreuses en Algérie | SARL Paper Solutions Industry' },
  description: 'PSI fabrique des rouleaux thermiques pour terminaux de paiement (TPE) et caisses enregistreuses. Vente aux entreprises dans toute l\'Algérie, demandez votre devis en ligne.',
  alternates: { canonical: '/' },
};

async function getCategories(): Promise<Cat[]> {
  try {
    const cats = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return cats.map((c: any) => ({ 
      id: c.id, 
      name: c.name, 
      photo: c.photo ?? null, 
      description: c.description ?? null 
    }));
  } catch {
    return [];
  }
}

async function getProducts(): Promise<Prod[]> {
  try {
    const products = await prisma.product.findMany({
      // Actif ET visible sur le site — indépendant l'un de l'autre (cf. Product.visibleOnSite).
      where: { active: true, visibleOnSite: true },
      // `photo` (produit ET catégorie imbriquée) n'est jamais affiché nulle part côté produit —
      // seule `getCategories()` ci-dessus sert la photo de catégorie, une seule fois. L'inclure
      // ici la dupliquait dans le HTML initial (SSR) pour CHAQUE produit, à chaque visite de
      // la page d'accueil — grosse partie du dépassement de quota Fast Origin Transfer Vercel.
      omit: { photo: true },
      include: { category: { omit: { photo: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return products as any;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [content, categories, products] = await Promise.all([
    getContent(),
    getCategories(),
    getProducts(),
  ]);
  
  return (
    <HomeClient 
      initialContent={content} 
      initialCategories={categories}
      initialProducts={products}
    />
  );
}
