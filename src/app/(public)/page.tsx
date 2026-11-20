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

async function getPartnerLogos() {
  try {
    const logos = await prisma.partnerLogo.findMany({ orderBy: { order: 'asc' } });
    // Le base64 n'est PAS mis dans la page (il y serait répété ×16 par la bande défilante) :
    // chaque logo est servi par /api/partner-logos/[id]/image, mis en cache par le navigateur.
    return logos.map((l) => ({ id: l.id, name: l.name, photo: l.photo ? `/api/partner-logos/${l.id}/image?v=${l.photo.length}` : null }));
  } catch {
    return [];
  }
}

// Photos supplémentaires des catégories (galerie « Contenu du site »), en URLs d'image versionnées.
// Requête SQL qui n'extrait QUE les positions/empreintes : les images base64 (dizaines de Ko chacune)
// ne sont jamais chargées ici. Seules les photos « de la catégorie » (non liées à une référence) comptent.
// L'index `i` suit la même normalisation que /api/content/gallery/image (entrées vides écartées).
async function getGalleryPhotos(): Promise<Record<string, string[]>> {
  try {
    const rows = await prisma.$queryRaw<{ categoryId: string; i: number; v: string; pid: string | null }[]>`
      SELECT replace(s."key", 'category_gallery_', '') AS "categoryId",
             (row_number() OVER (PARTITION BY s."key" ORDER BY s.ord) - 1)::int AS i,
             left(md5(s.src), 8) AS v,
             s.pid AS pid
      FROM (
        SELECT sc."key" AS "key", t.ord AS ord,
               CASE WHEN jsonb_typeof(t.elem) = 'string' THEN t.elem #>> '{}' ELSE t.elem ->> 'src' END AS src,
               CASE WHEN jsonb_typeof(t.elem) = 'object' THEN t.elem ->> 'productId' ELSE NULL END AS pid
        FROM "SiteContent" sc, jsonb_array_elements(sc.value::jsonb) WITH ORDINALITY AS t(elem, ord)
        WHERE sc."key" LIKE 'category_gallery_%'
      ) s
      WHERE coalesce(s.src, '') <> ''`;
    const out: Record<string, string[]> = {};
    for (const r of rows) {
      if (r.pid) continue; // photo liée à une référence : pas dans le diaporama de la carte
      (out[r.categoryId] ??= []).push(`/api/content/gallery/image?categoryId=${encodeURIComponent(r.categoryId)}&i=${r.i}&v=${r.v}`);
    }
    return out;
  } catch {
    return {};
  }
}

async function getCategories(): Promise<Cat[]> {
  try {
    const cats = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    const gallery = await getGalleryPhotos();
    return cats.map((c: any) => ({ 
      id: c.id, 
      name: c.name, 
      // URL de l'image (cachée par le navigateur) plutôt que le base64 dans le HTML de l'accueil
      photo: c.photo ? `/api/categories/${c.id}/image?v=${c.photo.length}` : null,
      description: c.description ?? null,
      quoteOnly: Boolean(c.quoteOnly),
      // Diaporama de la carte : photo principale d'abord, puis la galerie de la catégorie.
      photos: [
        ...(c.photo ? [`/api/categories/${c.id}/image?v=${c.photo.length}`] : []),
        ...(gallery[c.id] ?? []),
      ],
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
    // Catégorie « sur devis » : le prix n'est jamais envoyé au navigateur (pas dans le HTML de la page).
    return products.map((p) => (p.category?.quoteOnly ? { ...p, price: 0 } : p)) as any;
  } catch {
    return [];
  }
}

export default async function Home() {
  const [content, categories, products, partnerLogos] = await Promise.all([
    getContent(),
    getCategories(),
    getProducts(),
    getPartnerLogos(),
  ]);

  return (
    <HomeClient
      initialContent={content}
      initialCategories={categories}
      initialProducts={products}
      initialPartnerLogos={partnerLogos}
    />
  );
}
