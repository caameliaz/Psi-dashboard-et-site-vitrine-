'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { QuoteCTA } from '@/components/QuoteCTA';
import { useTranslation } from '@/lib/i18n';
import type { Cat, Prod } from '@/lib/hardcodedCatalog';

interface HomeClientProps {
  initialContent: Record<string, string>;
  initialCategories: Cat[];
  initialProducts: Prod[];
}

// Fait apparaître un item de la section Qualité en glissant de la droite vers
// sa place, avec un délai croissant selon sa position (haut → bas) pour un
// effet d'apparition en cascade au scroll.
function QualityItem({ delayMs, children }: { delayMs: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate(0, 0)' : 'translate(-32px, -24px)',
        transitionDelay: visible ? `${delayMs}ms` : '0ms',
      }}
    >
      {children}
    </div>
  );
}

// Met "papier thermique" en vert dans le titre du hero, que ce soit le texte
// par défaut ou un titre personnalisé saisi depuis l'admin.
function renderHeroTitle(text: string) {
  const m = text.match(/papier thermique/i);
  if (!m) return text;
  const i = m.index!;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-[#4CAF4F]">{text.slice(i, i + m[0].length)}</span>
      {text.slice(i + m[0].length)}
    </>
  );
}

export function HomeClient({ initialContent, initialCategories, initialProducts }: HomeClientProps) {
  const { t, lang } = useTranslation();
  const content = initialContent;

  // Idem pour le titre : le contenu éditable est en français uniquement.
  const heroTitre = (lang === 'fr' && content['hero_titre'])
    || `${t('hero.title_pre')}${t('hero.title_highlight')}${t('hero.title_post')}`;
  const heroSousTitre = (lang === 'fr' && content['hero_sous_titre']) || t('hero.subtitle');
  const aboutTexte      = content['about_texte'] ?? '';

  return (
    <div className="bg-white">

      {/* ════════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative min-h-[70vh] bg-cover bg-center flex items-center"
        style={{ backgroundImage: 'url(/imprimerie-chirat-production-30.webp)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(38,50,56,0.90)] via-[rgba(38,50,56,0.75)] to-[rgba(38,50,56,0.45)]" />

        <div className="relative w-full max-w-[1280px] mx-auto px-6 md:px-12 py-20">
          <div className="max-w-[760px] flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h1 className="text-[32px] md:text-[44px] font-extrabold text-white leading-tight tracking-tight">
                {renderHeroTitle(heroTitre)}
              </h1>
              <div className="w-10 h-[3px] bg-white rounded-full" />
              <p className="text-[14px] md:text-[16px] text-white/80 leading-relaxed">
                {heroSousTitre}
              </p>
            </div>

            <div className="flex flex-row flex-wrap gap-4 mt-4">
              <Link
                href="/cart"
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
      <section id="products" className="bg-white pt-10 pb-8 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-10">

          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-[28px] md:text-[36px] font-bold text-[#388E3C] leading-tight">
              {t('products_section.title')}
            </h2>
            <p className="text-[18px] md:text-[20px] text-[#1A1A1A] max-w-[520px] leading-relaxed [font-family:var(--font-noto-serif)]">
              {t('products_section.subtitle')}
            </p>
          </div>

          <CategoryBrowser 
            limit={6} 
            initialCategories={initialCategories}
            initialProducts={initialProducts}
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          QUALITÉ & CONFORMITÉ
      ════════════════════════════════════════════════════════════ */}
      <section id="contact" className="bg-[#F5F7FA] pt-6 px-8 md:px-20 mt-2 md:mt-3 mb-14 md:mb-20">
        <div className="flex flex-col gap-12 md:gap-14">
          <div className="flex flex-col gap-3 items-center text-center">
            <h2 className="text-[26px] md:text-[34px] font-bold text-[#388E3C] italic leading-snug">
              {t('quality.title2')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-20 gap-y-14 md:gap-x-28 md:gap-y-20">
            {[
              {
                titleKey: 'quality.badge1_title',
                descKey:  'quality.badge1_desc',
                icon: <img src="/icons8-papier-50-v2.png" alt="" className="w-9 h-9 md:w-11 md:h-11 object-contain" />,
              },
              {
                titleKey: 'quality.badge2_title',
                descKey:  'quality.badge2_desc',
                icon: <img src="/icons8-attestation-48.png" alt="" className="w-9 h-9 md:w-11 md:h-11 object-contain" />,
              },
              {
                titleKey: 'quality.badge3_title',
                descKey:  'quality.badge3_desc',
                icon: <img src="/icons8-imprimante-50-v2.png" alt="" className="w-9 h-9 md:w-11 md:h-11 object-contain" />,
              },
              {
                titleKey: 'quality.badge4_title',
                descKey:  'quality.badge4_desc',
                icon: <img src="/icons8-feuille-50-v2.png" alt="" className="w-9 h-9 md:w-11 md:h-11 object-contain" />,
              },
            ].map((item, i) => {
              // Cascade haut → bas, et droite → gauche à l'intérieur de chaque ligne
              // (index 0/2 = colonne gauche, 1/3 = colonne droite).
              const delayByIndex = [150, 0, 450, 300];
              return (
                <QualityItem key={item.titleKey} delayMs={delayByIndex[i]}>
                  <div className="flex flex-col gap-5 min-w-0">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <h3 className="text-[21px] md:text-[26px] font-semibold text-[#263238] [font-family:var(--font-playfair)] leading-tight">{t(item.titleKey)}</h3>
                    </div>
                    <p className="text-[15px] md:text-[17px] text-[#1A1A1A] leading-loose">{t(item.descKey)}</p>
                  </div>
                </QualityItem>
              );
            })}
          </div>
        </div>

        <div className="mt-10 -mx-8 md:-mx-20">
          <QuoteCTA id="devis" fullBleed />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          À PROPOS
      ════════════════════════════════════════════════════════════ */}
      <section id="about" className="bg-white pt-8 pb-20 px-6 md:px-12">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
          <h2 className="text-[28px] md:text-[36px] font-bold text-[#388E3C] leading-tight">
            {t('about.title')}
          </h2>
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex flex-col gap-5 text-[16px] md:text-[17px] text-[#717171] leading-[1.75] flex-1">
              {/* Le contenu éditable en base n'existe qu'en FRANÇAIS : dans les
                  autres langues on affiche la traduction, sinon le texte restait
                  en français même en arabe. */}
              {aboutTexte && lang === 'fr'
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
