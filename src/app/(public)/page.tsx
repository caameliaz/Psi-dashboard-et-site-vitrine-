import { HomeClient } from '@/components/HomeClient';
import type { Cat, Prod } from '@/lib/hardcodedCatalog';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Fetch des données côté serveur pour performance
async function getContent() {
  try {
    const res = await fetch(`${baseUrl}/api/content`, { cache: 'no-store' });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function getCategories(): Promise<Cat[]> {
  try {
    const res = await fetch(`${baseUrl}/api/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((c: any) => ({ 
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
    const res = await fetch(`${baseUrl}/api/products`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
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
