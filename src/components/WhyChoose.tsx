'use client';

import { Reveal } from '@/components/Reveal';
import { ScrollUnderline } from '@/components/ScrollUnderline';
import { useTranslation } from '@/lib/i18n';

const ITEMS = [
  { n: 1, icon: '/icons8-papier-50-v2.png' },
  { n: 2, icon: '/icons8-attestation-48.png' },
  { n: 3, icon: '/icons8-imprimante-50-v2.png' },
  { n: 4, icon: '/icons8-feuille-50-v2.png' },
] as const;

// « Pourquoi nous choisir »: 4 arguments en cartes, photo en diagonale avec fondu sur le côté.
export function WhyChoose() {
  const { t } = useTranslation();

  return (
    <section id="why" className="relative overflow-hidden bg-[#F5F7FA] py-16 md:py-24">
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-12">
        <div className="lg:w-[56%] flex flex-col gap-8">
          <Reveal className="flex flex-col items-start gap-3">
            <ScrollUnderline className="text-[32px] md:text-[48px] font-medium tracking-tight text-[#263238] leading-[1.1]">
              {t('why.title')}
            </ScrollUnderline>
            <p className="text-[15px] md:text-[17px] text-[#263238]/70 max-w-[520px] leading-relaxed">
              {t('why.subtitle')}
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            {ITEMS.map((item, i) => (
              <Reveal key={item.n} delayMs={i * 120}>
                <div className="group h-full flex flex-col gap-3 rounded-2xl border border-white bg-white/70 backdrop-blur-md p-5 shadow-[0_6px_24px_rgba(38,50,56,0.06)] transition-all duration-300 ease-out hover:-translate-y-1.5 hover:bg-white hover:shadow-[0_16px_40px_rgba(38,50,56,0.12)]">
                  <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <img src={item.icon} alt="" className="w-7 h-7 object-contain" />
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#263238] leading-snug">{t(`quality.badge${item.n}_title`)}</h3>
                  <p className="text-[14px] text-[#263238]/65 leading-relaxed">{t(`quality.badge${item.n}_desc_short`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mobile: photo sous les cartes */}
        <Reveal y={0} className="lg:hidden mt-10">
          <img src="/images/why-rouleau.jpg" alt="" loading="lazy" className="w-full h-64 object-cover rounded-3xl shadow-[0_16px_48px_rgba(38,50,56,0.15)]" />
        </Reveal>
      </div>

      {/* Desktop: photo en diagonale, fondue vers le fond de la section */}
      <Reveal y={0} className="hidden lg:block absolute inset-y-0 end-0 w-[46%]">
        <img
          src="/images/why-rouleau.jpg"
          alt=""
          loading="lazy"
          className="h-full w-full object-cover brightness-[0.78] [mask-image:linear-gradient(100deg,transparent_8%,black_42%)] [-webkit-mask-image:linear-gradient(100deg,transparent_8%,black_42%)] rtl:[mask-image:linear-gradient(260deg,transparent_8%,black_42%)] rtl:[-webkit-mask-image:linear-gradient(260deg,transparent_8%,black_42%)]"
        />
      </Reveal>
    </section>
  );
}
