'use client';

import { CategoryBrowser } from '@/components/CategoryBrowser';
import { useTranslation } from '@/lib/i18n';

export default function ProductsPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white min-h-screen">

      {/* Header */}
      <div className="bg-[#F5F7FA] border-b border-[#ABBED1]/30 py-14 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-3">
          <span className="text-[13px] font-semibold text-[#4CAF4F] uppercase tracking-widest">
            {t('products_page.badge')}
          </span>
          <h1 className="text-[40px] md:text-[54px] font-bold text-[#388E3C] leading-tight">
            {t('products_page.title')}
          </h1>
          <p className="text-[18px] md:text-[20px] text-[#717171] max-w-[560px] leading-relaxed">
            {t('products_page.subtitle')}
          </p>
        </div>
      </div>

      {/* Catégories → produits */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-14">
        <CategoryBrowser />

        {/* CTA bas de page */}
        <div className="mt-16 bg-white rounded-2xl shadow-[0_4px_24px_rgba(171,190,209,0.35)] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <p className="text-[20px] font-bold text-[#263238]">
              {t('products_page.cta_title')}
            </p>
            <p className="text-[15px] text-[#717171]">
              {t('products_page.cta_subtitle')}
            </p>
          </div>
          <a
            href="/quote"
            className="shrink-0 bg-[#4CAF4F] text-white text-[15px] font-semibold px-8 py-3.5 rounded-xl shadow-[0_4px_14px_rgba(76,175,79,0.4)] hover:bg-[#43A047] transition-all whitespace-nowrap"
          >
            {t('products_page.cta_btn')}
          </a>
        </div>
      </div>
    </div>
  );
}
