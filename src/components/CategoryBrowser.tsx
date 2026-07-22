'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';
import { type Cat, type Prod } from '@/lib/hardcodedCatalog';

// Grille de catégories : chaque card affiche une image, un nom
// et un carrousel de références (produits de la catégorie) qu'on parcourt à la flèche.
export function CategoryBrowser({ limit }: { limit?: number }) {
  const { t } = useTranslation();
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then((data: any[]) =>
      setCats(data.map(c => ({ id: c.id, name: c.name, photo: c.photo ?? null, description: c.description ?? null })))
    ).catch(() => {});
    fetch('/api/products').then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

  // Masque les catégories qui n'ont AUCUN produit actif (ex: catégorie entièrement désactivée)
  const catsWithProducts = cats.filter((c) =>
    products.some((p) => p.category?.id === c.id && p.width > 0 && p.length > 0)
  );
  const visibleCats = limit ? catsWithProducts.slice(0, limit) : catsWithProducts;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {visibleCats.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            products={products.filter(p => p.category?.id === cat.id && p.width > 0 && p.length > 0)}
          />
        ))}
      </div>

      {limit && cats.length > limit && (
        <Link
          href="/products"
          className="self-center border-2 border-[#4CAF4F] text-[#4CAF4F] text-[14px] font-semibold px-7 py-3 rounded-full hover:bg-[#4CAF4F] hover:text-white transition-all"
        >
          {t('products_section.cta')}
        </Link>
      )}
    </div>
  );
}

function CategoryCard({ category, products }: { category: Cat; products: Prod[] }) {
  const { t } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);
  const trackRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const current = products.find((p) => p.id === selectedId) ?? products[0];

  const scrollByPage = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Image catégorie — garde son propre container. Avec une vraie photo, elle se fond
          dans le fond de la page (pas de carte blanche/ombre) et reste entière (object-contain). */}
      <Link
        href={`/products/${category.id}`}
        className={`group relative rounded-2xl transition-shadow w-[95%] mx-auto h-72 md:h-80 flex items-center justify-center overflow-hidden ${
          category.photo ? 'p-3' : 'bg-[#F5F7FA] shadow-[0_4px_24px_rgba(171,190,209,0.35)] hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)]'
        }`}
      >
        {category.photo ? (
          <img src={category.photo} alt={category.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:-translate-y-1.5" />
        ) : (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
            <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
          </div>
        )}
        <span className="absolute bottom-3 left-3 text-[12px] font-semibold text-[#4CAF4F] bg-white/90 px-2.5 py-1 rounded-lg shadow-[0_2px_8px_rgba(171,190,209,0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Aperçu
        </span>
      </Link>

      {/* Titre + refs + bouton, alignés avec la largeur de la photo */}
      <div className="w-[95%] mx-auto flex flex-col gap-3">
        <Link href={`/products/${category.id}`}>
          <h3 className="text-[15px] md:text-[16px] font-bold text-[#263238] leading-tight hover:text-[#4CAF4F] transition-colors">{category.name}</h3>
        </Link>

        {products.length === 0 ? (
          <p className="text-[13px] text-[#717171]">{t('common.no_products')}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Étiquettes défilables (dimensions + métrage) — la sélectionnée est verte */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={products.length < 2}
                aria-label="Précédent"
                className="shrink-0 w-6 h-6 rounded-full border border-[#ABBED1]/50 flex items-center justify-center text-[#717171] hover:border-[#4CAF4F] hover:text-[#4CAF4F] disabled:opacity-30 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div
                ref={trackRef}
                className="flex-1 flex gap-2 overflow-x-auto min-w-0 [scrollbar-width:thin] [scrollbar-color:#4CAF4F_#F0F4F8] [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-track]:bg-[#F0F4F8] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#4CAF4F] [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {products.map((p) => {
                  const isSelected = p.id === current.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-[12px] font-bold whitespace-nowrap transition-all ${
                        isSelected
                          ? 'border-[#4CAF4F] bg-[#4CAF4F] text-white shadow-[0_3px_10px_rgba(76,175,79,0.3)]'
                          : 'border-[#E0E0E0] bg-white text-[#374151] hover:border-[#4CAF4F]/60 hover:outline hover:outline-1 hover:outline-[#CBD5E1] hover:shadow-[0_4px_14px_rgba(171,190,209,0.5)]'
                      }`}
                    >
                      {p.width}mm × {p.length}
                      {p.metrage != null ? ` · ${p.metrage} m` : ''}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={products.length < 2}
                aria-label="Suivant"
                className="shrink-0 w-6 h-6 rounded-full border border-[#ABBED1]/50 flex items-center justify-center text-[#717171] hover:border-[#4CAF4F] hover:text-[#4CAF4F] disabled:opacity-30 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Usage de la référence sélectionnée (à quoi ça sert) */}
            {current?.usage && (
              <p className="text-[12px] text-[#717171] leading-relaxed line-clamp-2 min-h-[32px]">{current.usage}</p>
            )}

            {/* Ajouter au panier — prix mis à jour selon la réf choisie */}
            <button
              onClick={() => addItem({ productId: current.id, quantity: 1, reference: current.reference, unitPrice: current.price })}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-[#4CAF4F]/40 bg-[#F0FDF4] px-4 py-2.5 hover:border-[#4CAF4F] hover:bg-[#E3F9E5] transition-colors"
            >
              <span className="text-[13px] font-semibold text-[#263238]">{t('common.add_to_cart')}</span>
              <span className="flex items-center gap-3">
                <span className="w-px h-4 bg-[#4CAF4F]/30" />
                <span className="text-[13px] font-bold text-[#4CAF4F] whitespace-nowrap">{current.price.toFixed(2)} DA</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
