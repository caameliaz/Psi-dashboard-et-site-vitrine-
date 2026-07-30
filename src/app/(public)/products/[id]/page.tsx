'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useTranslation } from '@/lib/i18n';
import { QuoteCTA } from '@/components/QuoteCTA';
import { FormatPreview } from '@/components/FormatPreview';
import { type Cat, type Prod, getFallbackDescription } from '@/lib/hardcodedCatalog';

// Icônes des fiches techniques (Largeur / Diamètre / Mandrin / Papier / Grammage / Couleur)
function specIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('largeur')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 12l4-4M3 12l4 4M21 12l-4-4M21 12l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (l.includes('diamètre') || l.includes('diametre')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 19L19 5M5 19l3-1M5 19l1-3M19 5l-3 1M19 5l-1 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (l.includes('mandrin')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
  );
  if (l.includes('papier')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M15 2v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  );
  if (l.includes('grammage') || l.includes('poids')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 9.5L5 21h14l-3.5-11.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  );
  if (l.includes('couleur')) return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/></svg>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useTranslation();
  const addItem = useCartStore((s) => s.addItem);

  const [cats, setCats] = useState<Cat[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [index, setIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const refsTrackRef = useRef<HTMLDivElement>(null);

  const scrollRefsByPage = (dir: 1 | -1) => {
    const track = refsTrackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  };

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

  // Mettre à jour le titre de la page dynamiquement
  useEffect(() => {
    if (category) {
      document.title = `${category.name} - PSI`;
    }
  }, [category]);

  if (!category) {
    return <div className="min-h-[50vh] flex items-center justify-center text-[#717171]">{t('common.loading')}</div>;
  }

  const description = category.description || getFallbackDescription(category.name, lang) || '';

  // Fiche technique : Largeur (toujours dispo) + champs personnalisés du produit (Diamètre, Mandrin, Papier, Grammage, Couleur…)
  const specRows = current
    ? [
        { key: 'largeur', label: t('product_detail.spec_width'), value: `${current.width} mm` },
        ...(current.customFields ?? []).map((cf) => ({ key: cf.definition.label, label: cf.definition.label, value: cf.value })),
      ]
    : [];
  const total = current ? current.price * qty : 0;

  const refsBlock = items.length > 0 && (
    <div className="flex flex-col gap-3 mt-2">
      <h2 className="text-[17px] font-bold text-[#263238]">{t('product_detail.available_refs')}</h2>

      {/* Étiquettes défilables (dimensions + métrage) — la sélectionnée est verte */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => scrollRefsByPage(-1)}
          disabled={items.length < 2}
          aria-label={t('product_detail.prev_ref_aria')}
          className="shrink-0 w-7 h-7 rounded-full border border-[#ABBED1]/50 flex items-center justify-center text-[#717171] hover:border-[#4CAF4F] hover:text-[#4CAF4F] disabled:opacity-30 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div
          ref={refsTrackRef}
          className="flex-1 flex gap-2 overflow-x-auto min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((p, i) => {
            const active = i === index;
            return (
              <button
                key={p.id}
                onClick={() => { setIndex(i); setQty(1); }}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-[13px] font-bold whitespace-nowrap transition-all ${
                  active
                    // Bordure VERTE : la référence choisie doit se voir nettement
                    ? 'border-[#4CAF4F] border-2 bg-[#F0FDF4] text-[#166534] shadow-[0_4px_12px_rgba(76,175,79,0.25)]'
                    : 'border-[#E0E0E0] bg-white text-[#374151] hover:border-[#4CAF4F]/60 hover:outline hover:outline-1 hover:outline-[#CBD5E1] hover:shadow-[0_4px_14px_rgba(171,190,209,0.5)]'
                }`}
              >
                {/* Format « 57/50 mm » — le métrage a sa propre ligne plus bas */}
                {p.width}/{p.length} mm
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollRefsByPage(1)}
          disabled={items.length < 2}
          aria-label={t('product_detail.next_ref_aria')}
          className="shrink-0 w-7 h-7 rounded-full border border-[#ABBED1]/50 flex items-center justify-center text-[#717171] hover:border-[#4CAF4F] hover:text-[#4CAF4F] disabled:opacity-30 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Usage de la référence sélectionnée (à quoi ça sert) */}
      {current?.usage && (
        <p className="text-[13px] text-[#717171] leading-relaxed">{current.usage}</p>
      )}
    </div>
  );

  const specsBlock = specRows.length > 0 && (
    <div className="flex flex-col gap-3 mt-2">
      <h2 className="text-[17px] font-bold text-[#263238]">{t('product_detail.specs_title')}</h2>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 rounded-xl border border-[#E0E0E0] p-4">
        {specRows.map((row) => (
          <div key={row.key} className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full border border-[#4CAF4F]/30 flex items-center justify-center flex-shrink-0 text-[#4CAF4F]">
              {specIcon(row.label)}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] font-bold text-[#8A9BB5] uppercase tracking-wide truncate">{row.label}</span>
              <span className="text-[13px] font-semibold text-[#263238] truncate">{row.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const addButton = current && (
    <button
      onClick={() => addItem({ productId: current.id, quantity: qty, reference: current.reference, unitPrice: current.price })}
      className="w-full flex items-center justify-center gap-2 bg-[#4CAF4F] text-white text-[13px] sm:text-[15px] font-bold py-3.5 rounded-xl hover:bg-[#43A047] shadow-[0_4px_14px_rgba(76,175,79,0.4)] transition-all"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="truncate">{t('common.add_to_cart')}</span>
    </button>
  );

  const summaryBlock = current && (
    <div className="bg-white border border-[#E0E0E0] rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-[#717171]">{t('product_detail.ref_label')}</span>
        <span className="font-semibold text-[#263238]">{current.width}/{current.length} mm</span>
      </div>
      {current.metrage != null && (
        <div className="flex items-center justify-between text-[14px]">
          <span className="text-[#717171]">{t('product_detail.metrage_label')}</span>
          <span className="font-semibold text-[#263238]">{current.metrage} m</span>
        </div>
      )}
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

      {addButton}
    </div>
  );

  const photoBlock = (heightClass: string) => (
    <div className={`${category.photo ? '' : 'bg-[#F5F7FA]'} rounded-2xl overflow-hidden ${heightClass} flex items-center justify-center p-3`}>
      {category.photo ? (
        <img src={category.photo} alt={category.name} className="w-full h-full object-contain" />
      ) : (
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-[#E8F5E9] border-2 border-[#4CAF4F]" />
          <div className="absolute inset-[30%] rounded-full bg-[#4CAF4F]" />
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-10 flex flex-col gap-8">

        {/* Fil d'Ariane — masqué sur mobile */}
        <div className="hidden md:flex items-center gap-2 text-[14px]">
          <Link href="/products" className="text-[#4CAF4F] font-semibold hover:underline">
            {t('nav.products')}
          </Link>
          <span className="text-[#ABBED1]">→</span>
          <span className="text-[#717171]">{category.name}</span>
        </div>

        {/* ── Mobile : titre → description → photo → refs → total/panier → détails ── */}
        <div className="flex lg:hidden flex-col gap-5">
          <h1 className="text-[27px] font-extrabold text-[#388E3C] leading-tight">
            {category.name}
          </h1>
          {description && (
            <p className="text-[13px] text-[#4D4D4D] leading-relaxed">
              {description}
            </p>
          )}

          {photoBlock('h-[260px]')}

          {refsBlock}
          {summaryBlock}
          {specsBlock}
        </div>

        {/* ── Desktop : grid 2 colonnes ── */}
        <div className="hidden lg:grid grid-cols-2 gap-16">

          {/* Colonne gauche : description + références */}
          <div className="flex flex-col gap-5">
            <span className="text-[13px] font-bold text-[#4CAF4F] uppercase tracking-wide">
              {t('product_detail.fast_delivery')}
            </span>
            <h1 className="text-[46px] font-extrabold text-[#388E3C] leading-tight">
              {category.name}
            </h1>
            {description && (
              <p className="text-[16px] text-[#4D4D4D] leading-relaxed">
                {description}
              </p>
            )}

            {refsBlock}
            {specsBlock}
          </div>

          {/* Colonne droite : photo de la catégorie + récap */}
          <div className="flex flex-col gap-5">
            {photoBlock('h-[440px]')}
            {summaryBlock}
          </div>
        </div>

        {/* Autres catégories */}
        {otherCats.length > 0 && (
          <div className="flex flex-col gap-6 mt-6">
            <h2 className="text-[27px] md:text-[32px] font-extrabold text-[#388E3C]">
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
