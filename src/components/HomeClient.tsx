'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { WhyChoose } from '@/components/WhyChoose';
import { AboutCarousel } from '@/components/AboutCarousel';
import { HomeQuoteForm } from '@/components/HomeQuoteForm';
import { ArrowButton } from '@/components/ArrowButton';
import { ScrollUnderline } from '@/components/ScrollUnderline';
import { Reveal } from '@/components/Reveal';
import { useTranslation } from '@/lib/i18n';
import type { Cat, Prod } from '@/lib/hardcodedCatalog';

const CONTACT_PHONE = '213770150656';

interface HomeClientProps {
  initialContent: Record<string, string>;
  initialCategories: Cat[];
  initialProducts: Prod[];
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
  const [quoteOpen, setQuoteOpen] = useState(false);

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
        className="relative min-h-[calc(100vh-48px)] min-h-[calc(100svh-48px)] flex flex-col bg-cover bg-center rounded-b-[32px] md:rounded-b-[56px] overflow-hidden"
        style={{ backgroundImage: 'url(/imprimerie-chirat-production-30.webp)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(38,50,56,0.90)] via-[rgba(38,50,56,0.70)] to-[rgba(38,50,56,0.35)]" />

        <div className="relative flex-1 flex items-center w-full max-w-[1440px] mx-auto px-6 md:px-12 pt-32 pb-10">
          <div className="max-w-[720px] flex flex-col gap-6">
            <Reveal className="flex flex-col gap-5">
              <h1 className="text-[40px] md:text-[64px] font-medium text-white leading-[1.1] tracking-tight">
                {renderHeroTitle(heroTitre)}
              </h1>
              <p className="text-[15px] md:text-[17px] text-white/80 leading-relaxed max-w-[560px]">
                {heroSousTitre}
              </p>
            </Reveal>

            <Reveal delayMs={150} className="flex flex-col gap-8 mt-2">
              <ArrowButton href="/products" variant="white-green" className="self-start">{t('hero.cta_products_short')}</ArrowButton>

              <div className="flex flex-col gap-2">
                <div className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" />
                    </svg>
                  ))}
                </div>
                <p className="text-[15px] md:text-[16px] text-white/85">{t('hero.clients')}</p>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Carte verre dépoli: au survol, elle s'ouvre sur les moyens de demander un devis */}
        <div className="relative md:absolute md:bottom-10 md:end-28 z-10 mx-6 mb-8 md:m-0">
          <div
            onMouseEnter={() => setQuoteOpen(true)}
            onMouseLeave={() => setQuoteOpen(false)}
            className="w-full md:w-[340px] rounded-3xl border border-white/25 bg-white/15 backdrop-blur-md p-4 text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)]"
          >
            <div className={`grid transition-all duration-300 ease-out ${quoteOpen ? 'grid-rows-[1fr] opacity-100 mb-4' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden flex flex-col gap-4">
                <p className="text-[14px] leading-relaxed text-white/90">{t('hero.quote_card_text')}</p>
                <div className="flex gap-2">
                  <a
                    href={`tel:+${CONTACT_PHONE}`}
                    className="flex-1 text-center text-[13px] font-semibold py-2.5 rounded-full border border-white/50 hover:bg-white hover:text-[#263238] transition-colors"
                  >
                    {t('hero.call')}
                  </a>
                  <a
                    href={`https://wa.me/${CONTACT_PHONE}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-[13px] font-semibold py-2.5 rounded-full border border-white/50 hover:bg-[#25D366] hover:border-[#25D366] transition-colors"
                  >
                    {t('hero.whatsapp')}
                  </a>
                </div>
              </div>
            </div>

            {quoteOpen ? (
              <ArrowButton href="/quote" variant="white-dark" className="w-full">{t('hero.cta_quote')}</ArrowButton>
            ) : (
              <ArrowButton onClick={() => setQuoteOpen(true)} variant="white-dark" className="w-full">{t('hero.cta_quote')}</ArrowButton>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          PRODUITS
      ════════════════════════════════════════════════════════════ */}
      <section id="products" className="relative overflow-hidden bg-gradient-to-b from-white via-[#F1F7F2] to-white pt-8 pb-12 px-6 md:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -end-24 w-[420px] h-[420px] rounded-full bg-[#4CAF4F]/15 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 -start-24 w-[360px] h-[360px] rounded-full bg-[#4A90D9]/10 blur-3xl" />
        <div className="relative max-w-[1440px] mx-auto flex flex-col gap-0">

          <Reveal className="flex flex-col items-start gap-3 text-start">
            <ScrollUnderline className="text-[32px] md:text-[48px] font-medium tracking-tight text-[#263238] leading-[1.1]">
              {t('products_section.title')}
            </ScrollUnderline>
            <p className="text-[15px] md:text-[17px] text-[#263238]/70 max-w-[560px] leading-relaxed">
              {t('products_section.subtitle')}
            </p>
          </Reveal>

          <CategoryBrowser 
            limit={6} 
            initialCategories={initialCategories}
            initialProducts={initialProducts}
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          POURQUOI NOUS CHOISIR
      ════════════════════════════════════════════════════════════ */}
      <WhyChoose />

      {/* ════════════════════════════════════════════════════════════
          À PROPOS
      ════════════════════════════════════════════════════════════ */}
      <section id="about" className="bg-white py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-8">
          <Reveal className="flex flex-col items-start gap-3">
            <ScrollUnderline className="text-[32px] md:text-[48px] font-medium tracking-tight text-[#263238] leading-[1.1]">
              {t('about.title')}
            </ScrollUnderline>
          </Reveal>
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
            <Reveal className="flex flex-col gap-5 text-[15px] md:text-[17px] text-[#263238]/70 leading-[1.75] flex-1">
              {/* Le contenu éditable en base n'existe qu'en FRANÇAIS : dans les
                  autres langues on affiche la traduction, sinon le texte restait
                  en français même en arabe. */}
              {aboutTexte && lang === 'fr'
                ? aboutTexte.split(/\n\n/).map((para, i) => <p key={i}>{para}</p>)
                : <>
                    <p>{t('about.p1')}</p>
                    <p>{t('about.p2')}</p>
                    <p>{t('about.p3')}</p>
                  </>
              }
            </Reveal>
            <Reveal delayMs={150} className="lg:w-[520px] shrink-0 w-full">
              <AboutCarousel />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════
          DEVIS
      ════════════════════════════════════════════════════════════ */}
      <HomeQuoteForm />

    </div>
  );
}
