'use client';

import { useState } from 'react';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { WhyChoose } from '@/components/WhyChoose';
import { PartnerLogosMarquee, type PartnerLogo } from '@/components/PartnerLogosMarquee';
import { HomeQuoteForm } from '@/components/HomeQuoteForm';
import { ArrowButton } from '@/components/ArrowButton';
import { ScrollUnderline } from '@/components/ScrollUnderline';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Reveal } from '@/components/Reveal';
import { useTranslation } from '@/lib/i18n';
import type { Cat, Prod } from '@/lib/hardcodedCatalog';

interface HomeClientProps {
  initialContent: Record<string, string>;
  initialCategories: Cat[];
  initialProducts: Prod[];
  initialPartnerLogos: PartnerLogo[];
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

export function HomeClient({ initialContent, initialCategories, initialProducts, initialPartnerLogos }: HomeClientProps) {
  const { t, lang } = useTranslation();
  const content = initialContent;
  const [quoteOpen, setQuoteOpen] = useState(false);

  // Idem pour le titre : le contenu éditable est en français uniquement.
  const heroTitre = (lang === 'fr' && content['hero_titre'])
    || `${t('hero.title_pre')}${t('hero.title_highlight')}${t('hero.title_post')}`;
  const heroSousTitre = (lang === 'fr' && content['hero_sous_titre']) || t('hero.subtitle');
  const aboutTexte      = content['about_texte'] ?? '';
  // Numéro modifiable depuis le dashboard (Réglages > Contenu), au format international sans « + ».
  const CONTACT_PHONE = (content['contact_telephone'] ?? '+213770150656').replace(/\D/g, '').replace(/^0/, '213');

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
                    <Reveal key={i} x={-16} y={0} delayMs={150 + i * 90} className="inline-block">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z" />
                      </svg>
                    </Reveal>
                  ))}
                </div>
                <Reveal x={-16} y={0} delayMs={150 + 5 * 90}>
                  <p className="text-[15px] md:text-[16px] text-white/85">{(lang === 'fr' && content['hero_clients']) || t('hero.clients')}</p>
                </Reveal>
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
        <div className="relative max-w-[1440px] mx-auto flex flex-col gap-10">

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
      <WhyChoose content={content} />

      {/* ════════════════════════════════════════════════════════════
          À PROPOS
      ════════════════════════════════════════════════════════════ */}
      <section id="about" className="bg-white pt-16 md:pt-24 pb-10 md:pb-14 px-6 md:px-12">
        {/* Grille à zones nommées : titre (haut-gauche) + photo portrait (haut-droite, même
            rangée) ; puis grande photo (bas-gauche) + texte/chiffres/bouton (bas-milieu) + petite
            photo (bas-droite). La colonne de droite (zone "photos") s'étend sur les 2 rangées,
            donc sa hauteur totale = hauteur du titre + hauteur de la grande photo, comme sur la
            maquette (les 2 colonnes de gauche finissent au même niveau que la photo de droite). */}
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[1fr_0.9fr_0.9fr] md:grid-rows-[auto_1fr] gap-x-6 md:gap-x-8 gap-y-4 md:h-[580px]">
          {/* `translate-y` (pas `margin-top`) : décale SEULEMENT ce bloc visuellement, sans
              agrandir la rangée du haut de la grille — un `margin-top` ici grandirait la rangée
              et pousserait TOUT ce qui suit (photo de gauche, chiffres...) vers le bas avec lui. */}
          <div className="md:col-start-1 md:col-span-2 md:row-start-1 md:translate-y-[39px]">
            <Reveal className="flex flex-col items-start gap-2 justify-end">
              <ScrollUnderline className="text-[32px] md:text-[40px] font-medium tracking-tight text-[#263238] leading-[1.15]">
                {t('about.title')}
              </ScrollUnderline>
              {/* 2 lignes maximum (line-clamp) : le texte complet, quelle que soit sa longueur
                  (modifiable depuis Contenu), ne doit jamais pousser la grille plus bas. */}
              <p className="text-[16px] text-[#263238]/70 leading-[1.6] w-full line-clamp-2 mt-6">
                {(aboutTexte && lang === 'fr' ? aboutTexte.replace(/\n\n/g, ' ') : t('about.p1'))}
              </p>
            </Reveal>
          </div>

          {/* Hauteur fixe (pas h-auto) : pour ne pas grandir automatiquement si la colonne de
              droite devient plus haute — seules les photos de droite doivent bouger. Plus de
              marge au-dessus (supprimée : elle créait un vide visible en haut de la cellule). */}
          <Reveal className="h-[220px] md:h-[380px] md:mt-16 md:col-start-1 md:row-start-2">
            <img src="/photo%202.avif" alt="" loading="lazy" className="w-[85%] mx-auto h-full object-cover rounded-3xl shadow-[0_16px_48px_rgba(38,50,56,0.18)]" />
          </Reveal>

          <Reveal delayMs={100} className="md:col-start-2 md:row-start-2 flex flex-col justify-end gap-3">
            {/* `mb-24` : lève SEULEMENT ce texte (pas les chiffres/bouton, qui restent collés en
                bas au niveau de la photo) en creusant l'espace juste en dessous de lui.
                `-mx-3` : élargit juste le texte (pas la colonne) pour le rapprocher des photos
                de chaque côté, sans changer la largeur des colonnes de la grille. */}
            <p className="text-[16px] text-[#263238]/70 leading-relaxed mb-24 -mx-3 md:-mx-4">
              {(lang === 'fr' && content['about_texte_2']) || t('about.p4')}
            </p>
            <div className="flex gap-10">
              <div className="flex flex-col gap-0.5">
                <span className="text-[26px] md:text-[32px] font-semibold text-[#263238]">
                  <AnimatedNumber value={(lang === 'fr' && content['about_stat1_valeur']) || t('about.stat1_value')} />
                </span>
                <span className="text-[13px] text-[#263238]/60">
                  {(lang === 'fr' && content['about_stat1_label']) || t('about.stat1_label')}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[26px] md:text-[32px] font-semibold text-[#263238]">
                  <AnimatedNumber value={`+${initialProducts.length}`} />
                </span>
                <span className="text-[13px] text-[#263238]/60">
                  {(lang === 'fr' && content['about_stat2_label']) || t('about.stat2_label')}
                </span>
              </div>
            </div>
            <ArrowButton href="/contact" variant="white-dark" className="self-start border border-[#263238]/15">{t('about.cta')}</ArrowButton>
          </Reveal>

          {/* `translate-y` ici aussi : décale seulement ces 2 photos, sans agrandir la rangée
              du haut (un `margin-top` sur cet élément row-span-2 gonflait la rangée "auto" et
              poussait photo de gauche + chiffres vers le bas avec lui). */}
          <div className="md:col-start-3 md:row-start-1 md:row-span-2 md:translate-y-[47px]">
            <Reveal delayMs={150} className="flex flex-col gap-5 md:gap-6 h-[280px] md:h-auto">
              {/* Les 2 photos ont maintenant des hauteurs FIXES (plus de `flex-1` qui remplissait tout
                  l'espace disponible) : celle du haut est rétrécie en hauteur ET largeur, celle du
                  bas seulement en largeur (hauteur inchangée) — colonne en `h-auto` du coup, pour
                  ne pas laisser de vide en dessous. */}
              <img src="/images/about-tpe.jpg" alt="" loading="lazy" className="md:h-[340px] md:shrink-0 w-[85%] mx-auto object-cover rounded-3xl shadow-[0_16px_48px_rgba(38,50,56,0.18)]" />
              <img src="/images/about-livraison.jpg" alt="" loading="lazy" className="md:h-[170px] md:shrink-0 md:mt-6 w-[85%] mx-auto object-cover rounded-3xl shadow-[0_16px_48px_rgba(38,50,56,0.18)]" />
            </Reveal>
          </div>
        </div>

        {content['about_logos_enabled'] === 'true' && (
          <Reveal className="max-w-[1440px] mx-auto mt-12 md:mt-16 flex items-center gap-8 md:gap-12">
            <div className="flex-1 min-w-0">
              <PartnerLogosMarquee logos={initialPartnerLogos} />
            </div>
            {/* À droite de la bande : texte simple (pas de chiffre), même gris que le nom des clients. */}
            <div className="hidden md:flex items-center shrink-0 border-s border-[#E2E8F0] ps-8">
              <span className="text-[16px] font-semibold text-[#263238]/70 whitespace-nowrap">
                Nos clients
              </span>
            </div>
          </Reveal>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════
          DEVIS
      ════════════════════════════════════════════════════════════ */}
      <HomeQuoteForm phone={CONTACT_PHONE} content={content} />

    </div>
  );
}
