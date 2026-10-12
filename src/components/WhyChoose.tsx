'use client';

import { Reveal } from '@/components/Reveal';
import { ScrollUnderline } from '@/components/ScrollUnderline';
import { ArrowButton } from '@/components/ArrowButton';
import { useTranslation } from '@/lib/i18n';

// Seuls 2 des 4 arguments d'origine sont gardés (compatibilité imprimantes + qualité/savoir-faire).
// Chaque carte a une liste de caractéristiques (éditable depuis Contenu > why_{n}_liste, une par
// ligne) révélée au dos de la carte quand elle se retourne au survol.
const ITEMS = [
  {
    n: 3,
    icon: '/icons8-imprimante-50-v2.png',
    defaultListFr: ['Commerces & points de vente', 'Banques & terminaux de paiement (TPE)', 'Restaurants & cafés', 'Pharmacies', 'Logistique & transport', 'Grande distribution'],
  },
  {
    n: 2,
    icon: '/icons8-attestation-48.png',
    defaultListFr: ['Grammage 55 g/m² premium', '100% sans BPA', 'Matières premières européennes certifiées', 'Transformé et conditionné en Algérie', 'Qualité constante garantie', 'Impression nette et longue durée'],
  },
] as const;

// Icône recolorée via CSS mask (plutôt qu'un filtre sur l'image) : même PNG icons8 affiché soit
// en blanc sur fond bleu nuit (face avant), soit en bleu nuit sur fond blanc (face arrière, au
// survol) — le mask garantit une couleur exacte quelle que soit la couleur d'origine du PNG.
function MaskIcon({ src, color }: { src: string; color: string }) {
  return (
    <div
      className="w-7 h-7"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      }}
    />
  );
}

// « Pourquoi nous choisir »: photo à droite, arguments en cartes à gauche — chaque carte se
// retourne au survol pour révéler la liste complète des caractéristiques/secteurs couverts.
export function WhyChoose({ content = {} }: { content?: Record<string, string> }) {
  const { t, lang } = useTranslation();
  // Textes modifiables depuis le dashboard (français uniquement, comme le reste du contenu éditable).
  const pick = (key: string, fallback: string) => (lang === 'fr' && content[key]) || fallback;

  return (
    <section id="why" className="bg-[#F8FAFC] py-20 md:py-32 px-6 md:px-12">
      <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
        <div className="flex-1 flex flex-col gap-10">
          <Reveal className="flex flex-col items-start gap-3">
            <ScrollUnderline className="text-[32px] md:text-[48px] font-medium tracking-tight text-[#263238] leading-[1.1]">
              {pick('why_titre', t('why.title'))}
            </ScrollUnderline>
            <p className="text-[15px] md:text-[17px] text-[#263238]/70 max-w-[520px] leading-relaxed">
              {pick('why_sous_titre', t('why.subtitle'))}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ITEMS.map((item, i) => {
              const listRaw = pick(`why_${item.n}_liste`, item.defaultListFr.join('\n'));
              const list = listRaw.split('\n').map((s) => s.trim()).filter(Boolean);
              return (
                <Reveal key={item.n} delayMs={i * 120} className="h-[340px] md:h-[380px]">
                  <div className="flip-card w-full h-full">
                    <div className="flip-card-inner">
                      {/* Face avant */}
                      <div className="flip-card-face flex flex-col items-start gap-3 rounded-3xl bg-white border border-[#E2E8F0] p-6 shadow-[0_8px_32px_rgba(38,50,56,0.06)]">
                        <div className="w-14 h-14 rounded-full bg-[#263238] flex items-center justify-center">
                          <MaskIcon src={item.icon} color="#FFFFFF" />
                        </div>
                        <h3 className="text-[18px] font-semibold text-[#263238] leading-snug">{pick(`why_${item.n}_titre`, t(`quality.badge${item.n}_title`))}</h3>
                        <p className="text-[14px] text-[#263238]/65 leading-relaxed">{pick(`why_${item.n}_desc`, t(`quality.badge${item.n}_desc_short`))}</p>
                      </div>

                      {/* Face arrière : se révèle au survol, fond bleu nuit, icône inversée (blanc -> bleu nuit sur rond blanc) */}
                      <div className="flip-card-face flip-card-back flex flex-col items-start gap-3 rounded-3xl bg-[#263238] p-6 shadow-[0_8px_32px_rgba(38,50,56,0.25)] overflow-y-auto">
                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0">
                          <MaskIcon src={item.icon} color="#263238" />
                        </div>
                        <h3 className="text-[16px] font-semibold text-white leading-snug">{pick(`why_${item.n}_titre`, t(`quality.badge${item.n}_title`))}</h3>
                        <ul className="flex flex-col gap-1.5">
                          {list.map((line, li) => (
                            <li key={li} className="text-[13px] text-white/85 leading-snug flex gap-2">
                              <span className="shrink-0">–</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delayMs={240}>
            <ArrowButton href="#devis" variant="white-dark" className="border border-[#263238]/15">{t('hero.cta_quote')}</ArrowButton>
          </Reveal>
        </div>

        <Reveal delayMs={150} y={0} className="w-full lg:w-[42%] shrink-0">
          <img
            src="/images/why-rouleau.jpg"
            alt=""
            loading="lazy"
            className="w-full h-[380px] md:h-[520px] object-cover rounded-3xl shadow-[0_16px_48px_rgba(38,50,56,0.15)]"
          />
        </Reveal>
      </div>
    </section>
  );
}
