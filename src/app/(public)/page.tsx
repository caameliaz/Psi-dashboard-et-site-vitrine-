'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { QuoteCTA } from '@/components/QuoteCTA';
import { useTranslation } from '@/lib/i18n';

export default function Home() {
  const { t } = useTranslation();
  const [content, setContent] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/content').then(r => r.ok ? r.json() : {}).then(setContent).catch(() => {});
  }, []);

  const heroTitreCustom = content['hero_titre'];
  const aboutTexte      = content['about_texte'] ?? '';

  return (
    <div className="bg-white">

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-[70vh] bg-cover bg-center flex items-center"
        style={{ backgroundImage: 'url(/photo%202.avif)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(38,50,56,0.90)] via-[rgba(38,50,56,0.75)] to-[rgba(38,50,56,0.45)]" />

        <div className="relative w-full max-w-[1280px] mx-auto px-6 md:px-12 py-20">
          <div className="max-w-[620px] flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] md:text-[38px] font-extrabold text-white leading-tight tracking-tight">
                {heroTitreCustom ?? <>{t('hero.title_pre')}<span className="text-[#4CAF4F]">{t('hero.title_highlight')}</span>{t('hero.title_post')}</>}
              </h1>
            </div>

            <div className="flex flex-row flex-wrap gap-4 mt-4">
              <Link
                href="/quote"
                className="flex items-center gap-2 bg-[#4CAF4F] text-white text-[14px] font-semibold px-6 py-3 rounded-lg shadow-[0px_4px_14px_rgba(76,175,79,0.5)] hover:bg-[#43A047] transition-all"
              >
                {t('hero.cta_order')}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PRODUITS
      ════════════════════════════════════════════════════════════ */}
      <section id="products" className="bg-white pt-10 pb-20 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10">

          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-[32px] md:text-[38px] font-bold text-[#263238] leading-tight">
              {t('products_section.title')}
            </h2>
            <p className="text-[16px] md:text-[18px] text-[#717171] max-w-[480px] leading-relaxed">
              {t('products_section.subtitle')}
            </p>
          </div>

          <CategoryBrowser limit={6} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          QUALITÉ & CONFORMITÉ
      ════════════════════════════════════════════════════════════ */}
      <section id="contact" className="bg-[#F5F7FA] py-16 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h2 className="text-[22px] md:text-[28px] font-bold text-[#263238] italic leading-snug">
              <span className="text-[#4CAF4F] mr-2">»</span>
              {t('quality.title2')}
            </h2>
            <div className="w-16 h-[3px] bg-[#4CAF4F] rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                titleKey: 'quality.badge1_title',
                descKey:  'quality.badge1_desc',
                icon: (
                  <img src="/lot-de-3-rouleaux-de-papier-pour-tableau.avif" alt="" className="w-full h-full object-cover" />
                ),
              },
              {
                titleKey: 'quality.badge2_title',
                descKey:  'quality.badge2_desc',
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="5" width="20" height="5" fill="#1a1a1a" rx="1"/>
                    <rect x="2" y="10" width="20" height="4.5" fill="#D32F2F"/>
                    <rect x="2" y="14.5" width="20" height="5" fill="#FDD835" rx="1"/>
                  </svg>
                ),
              },
              {
                titleKey: 'quality.badge3_title',
                descKey:  'quality.badge3_desc',
                icon: (
                  <img src="/images.jpg" alt="" className="w-full h-full object-cover" />
                ),
              },
            ].map((item) => (
              <div key={item.titleKey} className="bg-white border border-[#E0E0E0] rounded-2xl shadow-[0_4px_16px_rgba(171,190,209,0.3)] p-8 flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full border-2 border-[#E0E0E0] overflow-hidden flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-[18px] font-bold text-[#4CAF4F] italic">{t(item.titleKey)}</h3>
                <p className="text-[14px] text-[#717171] leading-relaxed">{t(item.descKey)}</p>
              </div>
            ))}
          </div>

          <QuoteCTA id="devis" />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          À PROPOS
      ════════════════════════════════════════════════════════════ */}
      <section id="about" className="bg-white py-20 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
          <h2 className="text-[32px] md:text-[38px] font-bold text-[#4D4D4D] leading-tight">
            {t('about.title')}
          </h2>
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex flex-col gap-5 text-[16px] md:text-[17px] text-[#717171] leading-[1.75] flex-1">
              {aboutTexte
                ? aboutTexte.split('\n\n').map((para, i) => <p key={i}>{para}</p>)
                : <>
                    <p>{t('about.p1')}</p>
                    <p>{t('about.p2')}</p>
                    <p>{t('about.p3')}</p>
                  </>
              }
            </div>
            <div className="lg:w-[460px] shrink-0 w-full">
              <div
                className="w-full h-[280px] md:h-[320px] bg-cover bg-center rounded-2xl shadow-[0_16px_48px_rgba(38,50,56,0.15)]"
                style={{ backgroundImage: 'url(/photo%202.avif)' }}
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
