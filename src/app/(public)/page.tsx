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
      where: { active: true },
      include: { category: true },
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
