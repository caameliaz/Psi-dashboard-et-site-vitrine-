'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';
import { QuoteCTA } from '@/components/QuoteCTA';
import { type Cat, type Prod, getFallbackDescription } from '@/lib/hardcodedCatalog';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);

  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then((data: any[]) =>
      setCats(data.map(c => ({ id: c.id, name: c.name, photo: c.photo ?? null, description: c.description ?? null })))
    ).catch(() => {});
    fetch('/api/products').then(r => r.ok ? r.json() : []).then(setProducts).catch(() => {});
  }, []);

  const category = cats.find(c => c.id === id);
  const otherCats = cats.filter(c => c.id !== id);
  const items = useMemo(
    () => products.filter(p => p.category?.id === id && p.width > 0 && p.length > 0),
    [products, id]
  );
  const current = items[index] ?? items[0];

  useEffect(() => { setIndex(0); setQty(1); }, [id]);

  if (!category) {
    return <div className="min-h-[50vh] flex items-center justify-center text-[#717171]">{t('common.loading')}</div>;
  }

  const description = category.description || getFallbackDescription(category.name, lang) || '';
  const total = current ? current.price * qty : 0;

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">

        {/* Fil d'Ariane */}
        <div className="flex items-center gap-2 text-[14px]">
          <Link href="/products" className="text-[#4CAF4F] font-semibold hover:underline">
            {t('nav.products')}
          </Link>
          <span className="text-[#ABBED1]">→</span>
          <span className="text-[#717171]">{category.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

          {/* ── Colonne gauche : description + références ── */}
          <div className="flex flex-col gap-5">
            <span className="text-[13px] font-bold text-[#4CAF4F] uppercase tracking-wide">
              {t('product_detail.fast_delivery')}
            </span>
            <h1 className="text-[34px] md:text-[42px] font-extrabold text-[#263238] leading-tight">
              {category.name}
            </h1>
            {description && (
              <p className="text-[15px] md:text-[16px] text-[#4D4D4D] leading-relaxed">
                {description}
              </p>
            )}

            {items.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                <h2 className="text-[15px] font-bold text-[#263238]">{t('product_detail.available_refs')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {items.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => { setIndex(i); setQty(1); }}
                      className={`text-left border rounded-xl p-3 transition-all ${
                        i === index
                          ? 'border-[#4CAF4F] bg-[#F0FDF4] shadow-[0_4px_12px_rgba(76,175,79,0.2)]'
                          : 'border-[#E0E0E0] hover:border-[#4CAF4F]/50'
                      }`}
                    >
                      <p className="text-[14px] font-bold text-[#263238] leading-5">
                        {p.width}mm × {p.length}m
                      </p>
                      <p className="text-[12px] text-[#717171] leading-4 mt-1">{p.usage}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Colonne droite : photo de la catégorie + récap ── */}
          <div className="flex flex-col gap-5">
            <div className="bg-[#F5F7FA] rounded-2xl overflow-hidden h-[320px] md:h-[380px] flex items-center justify-center">
              {category.photo ? (
                <img src={category.photo} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                  <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
                </div>
              )}
            </div>

            {/* Carte récapitulatif */}
            {current && (
              <div className="bg-white border border-[#E0E0E0] rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#717171]">{t('product_detail.ref_label')}</span>
                  <span className="font-semibold text-[#263238]">{current.width}mm × {current.length}m</span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#717171]">{t('product_detail.unit_price_label')}</span>
                  <span className="font-semibold text-[#263238]">{current.price.toFixed(2)} DA</span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#717171]">{t('quote.qty_label')}</span>
                  <div className="flex items-center gap-2 bg-[#F5F7FA] border border-[#E0E0E0] rounded-lg">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label={t('product_detail.decrease_qty_aria')}
                      className="w-8 h-8 flex items-center justify-center text-[#717171] hover:text-[#263238]"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-[14px] font-semibold text-[#263238]">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      aria-label={t('product_detail.increase_qty_aria')}
                      className="w-8 h-8 flex items-center justify-center text-[#717171] hover:text-[#263238]"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#E0E0E0] pt-4 flex items-center justify-between">
                  <span className="text-[15px] font-bold text-[#4CAF4F]">{t('cart.total')}</span>
                  <span className="text-[20px] font-extrabold text-[#4CAF4F]">{total.toFixed(2)} DA</span>
                </div>

                <button
                  onClick={() => addItem({ productId: current.id, quantity: qty, reference: current.reference, unitPrice: current.price })}
                  className="w-full flex items-center justify-center gap-2 bg-[#4CAF4F] text-white text-[15px] font-bold py-3.5 rounded-xl hover:bg-[#43A047] shadow-[0_4px_14px_rgba(76,175,79,0.4)] transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('common.add_to_cart')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Autres catégories */}
        {otherCats.length > 0 && (
          <div className="flex flex-col gap-6 mt-6">
            <h2 className="text-[24px] md:text-[28px] font-extrabold text-[#263238]">
              {t('product_detail.also_liked')}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {otherCats.map((c) => (
                <div key={c.id} className="border border-[#E0E0E0] rounded-2xl overflow-hidden flex flex-col shadow-[0_2px_10px_rgba(171,190,209,0.35)] hover:shadow-[0_8px_24px_rgba(171,190,209,0.5)] transition-shadow duration-200">
                  <Link href={`/products/${c.id}`} className="bg-[#F5F7FA] h-40 md:h-44 flex items-center justify-center overflow-hidden">
                    {c.photo ? (
                      <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
                        <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
                      </div>
                    )}
                  </Link>
                  <div className="p-4 flex flex-col items-start gap-3">
                    <p className="text-[14px] font-bold text-[#263238]">{c.name}</p>
                    <Link
                      href={`/products/${c.id}`}
                      className="border-2 border-[#4CAF4F] text-[#4CAF4F] text-[13px] font-semibold px-5 py-2 rounded-full hover:bg-[#4CAF4F] hover:text-white transition-all"
                    >
                      {t('product_detail.discover')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Devis — pleine largeur */}
      <div className="px-6 md:px-12 pb-16 mt-4">
        <QuoteCTA />
      </div>
    </div>
  );
}
