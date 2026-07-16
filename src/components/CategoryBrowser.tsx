'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';
import { type Cat, type Prod, getFallbackDescription } from '@/lib/hardcodedCatalog';

// Grille de catégories : chaque card affiche une image, un nom, une description
// et un carrousel de références (produits de la catégorie) qu'on parcourt à la flèche.
export function CategoryBrowser({ limit }: { limit?: number }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then((data: any[]) =>
      setCats(data.map(c => ({ id: c.id, name: c.name, photo: c.photo ?? null, description: c.description ?? null })))
    ).catch(() => {});
    fetch('/api/products').then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

  const visibleCats = limit ? cats.slice(0, limit) : cats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      {visibleCats.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          products={products.filter(p => p.category?.id === cat.id && p.width > 0 && p.length > 0)}
        />
      ))}
    </div>
  );
}

function CategoryCard({ category, products }: { category: Cat; products: Prod[] }) {
  const { t, lang } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);
  const [index, setIndex] = useState(0);

  const description = category.description || getFallbackDescription(category.name, lang) || '';
  const displayed = products.length <= 1 ? products : [products[index], products[(index + 1) % products.length]];

  const prev = () => setIndex((i) => (i - 1 + products.length) % products.length);
  const next = () => setIndex((i) => (i + 1) % products.length);

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] hover:shadow-[0_8px_32px_rgba(171,190,209,0.5)] transition-shadow flex flex-col overflow-hidden">
      {/* Image catégorie */}
      <Link href={`/products/${category.id}`} className="bg-[#F5F7FA] h-56 md:h-64 flex items-center justify-center overflow-hidden">
        {category.photo ? (
          <img src={category.photo} alt={category.name} className="w-full h-full object-cover" />
        ) : (
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
            <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
          </div>
        )}
      </Link>

      <div className="p-5 md:p-6 flex flex-col gap-4">
        <div>
          <Link href={`/products/${category.id}`}>
            <h3 className="text-[20px] md:text-[22px] font-bold text-[#263238] leading-tight hover:text-[#4CAF4F] transition-colors">{category.name}</h3>
          </Link>
          {description && (
            <p className="text-[13px] md:text-[14px] text-[#717171] leading-relaxed mt-1.5">{description}</p>
          )}
        </div>

        {products.length === 0 ? (
          <p className="text-[13px] text-[#717171]">{t('common.no_products')}</p>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              disabled={products.length < 2}
              aria-label={t('product_detail.prev_ref_aria')}
              className="shrink-0 w-8 h-8 rounded-full border border-[#ABBED1]/50 flex items-center justify-center text-[#717171] hover:border-[#4CAF4F] hover:text-[#4CAF4F] disabled:opacity-30 disabled:hover:border-[#ABBED1]/50 disabled:hover:text-[#717171] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="flex-1 flex gap-2 overflow-hidden">
              {displayed.map((p, i) => (
                <div
                  key={p.id}
                  className={`bg-[#F5F7FA] border border-[#E0E0E0] rounded-xl px-4 py-3.5 flex items-center justify-between gap-3 min-w-0 ${
                    i === 0 ? 'basis-[85%] sm:basis-[78%] shrink-0' : 'basis-[85%] sm:basis-[78%] shrink-0 opacity-50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] md:text-[16px] font-bold text-[#263238] leading-5 whitespace-nowrap">
                      {t('common.ref')} {p.width}mm × {p.length}m
                    </p>
                    <p className="text-[13px] md:text-[14px] text-[#717171] leading-5 truncate">{p.usage}</p>
                  </div>

                  <button
                    onClick={() => addItem({ productId: p.id, quantity: 1, reference: p.reference, unitPrice: p.price })}
                    className="shrink-0 bg-[#2196F3] text-white text-[12px] font-semibold px-3.5 py-2 rounded-lg hover:bg-[#1E88E5] transition-colors"
                  >
                    + {t('common.add_to_cart')}
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={next}
              disabled={products.length < 2}
              aria-label={t('product_detail.next_ref_aria')}
              className="shrink-0 w-8 h-8 rounded-full border border-[#ABBED1]/50 flex items-center justify-center text-[#717171] hover:border-[#4CAF4F] hover:text-[#4CAF4F] disabled:opacity-30 disabled:hover:border-[#ABBED1]/50 disabled:hover:text-[#717171] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
