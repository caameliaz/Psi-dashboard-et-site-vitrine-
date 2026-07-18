'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

// Container "besoin d'un devis" — utilisé sur l'accueil et la fiche produit.
export function QuoteCTA({ id }: { id?: string }) {
  const { t } = useTranslation();

  const features = [
    { name: t('quote_cta.feature1_name'), desc: t('quote_cta.feature1_desc') },
    { name: t('quote_cta.feature2_name'), desc: t('quote_cta.feature2_desc') },
    { name: t('quote_cta.feature3_name'), desc: t('quote_cta.feature3_desc') },
  ];

  return (
    <div id={id} className="bg-[#E8F5E9] rounded-[28px] p-8 md:p-12 flex flex-col md:flex-row gap-8 md:gap-12">
      <div className="flex-1 flex flex-col items-start gap-4 text-left">
        <h4 className="text-[20px] md:text-[22px] font-bold text-[#263238] italic leading-snug">
          {t('quote_cta.title')}
        </h4>
        <p className="text-[15px] text-[#4D4D4D] leading-relaxed">
          {t('quote_cta.desc')}
        </p>
        <Link
          href="/quote"
          className="bg-[#4CAF4F] text-white text-[15px] font-semibold px-7 py-3 rounded-xl shadow-[0_8px_24px_rgba(76,175,79,0.3)] hover:bg-[#43A047] transition-all"
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
            <p className="text-[15px] text-[#263238] leading-relaxed">
              <span className="font-bold">{item.name} — </span>{item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
