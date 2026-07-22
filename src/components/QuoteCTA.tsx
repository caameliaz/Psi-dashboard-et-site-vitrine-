'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

// Container "besoin d'un devis" — utilisé sur l'accueil et la fiche produit.
// fullBleed : le fond prend toute la largeur de l'écran, mais le contenu reste
// aligné sur la même colonne (max-w-[1280px]) que le reste de la page.
export function QuoteCTA({ id, fullBleed = false }: { id?: string; fullBleed?: boolean }) {
  const { t } = useTranslation();

  const features = [
    { name: t('quote_cta.feature1_name'), desc: t('quote_cta.feature1_desc') },
    { name: t('quote_cta.feature2_name'), desc: t('quote_cta.feature2_desc') },
    { name: t('quote_cta.feature3_name'), desc: t('quote_cta.feature3_desc') },
  ];

  const content = (
    <div className={`flex flex-col md:flex-row gap-8 md:gap-12 ${fullBleed ? 'max-w-[1280px] mx-auto px-6 md:px-12 py-10 md:py-14' : ''}`}>
      <div className="flex-1 flex flex-col items-start gap-4 text-left">
        <h4 className="text-[28px] md:text-[36px] font-bold text-[#388E3C] italic leading-tight">
          {t('quote_cta.title')}
        </h4>
        <p className="text-[17px] md:text-[18px] text-[#4D4D4D] leading-relaxed">
          {t('quote_cta.desc')}
        </p>
        <Link
          href="/quote"
          className="bg-[#4CAF4F] text-white text-[16px] font-semibold px-7 py-3 rounded-xl shadow-[0_8px_24px_rgba(76,175,79,0.3)] hover:bg-[#43A047] transition-all"
        >
          {t('quote_cta.btn')}
        </Link>
      </div>

      <div className="hidden md:block w-px bg-[#A5D6A7] self-stretch" />

      <div className="flex-1 flex flex-col gap-4 justify-center">
        {features.map((item) => (
          <div key={item.name} className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M4 10.5l4 4 8-9" stroke="#4CAF4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[16px] md:text-[17px] text-[#263238] leading-relaxed">
              <span className="font-bold">{item.name} — </span>{item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  if (fullBleed) {
    return <div id={id} className="bg-[#E8F5E9] w-full">{content}</div>;
  }

  return <div id={id} className="bg-[#E8F5E9] rounded-[28px] p-8 md:p-12">{content}</div>;
}
