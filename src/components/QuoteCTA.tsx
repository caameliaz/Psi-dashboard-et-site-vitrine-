'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

// Container "besoin d'un devis" — utilisé sur l'accueil et la fiche produit.
// fullBleed : le fond prend toute la largeur de l'écran, mais le contenu reste
// aligné sur la même colonne (max-w-[1280px]) que le reste de la page.
export function QuoteCTA({ id, fullBleed = false }: { id?: string; fullBleed?: boolean }) {
  const { t } = useTranslation();

  const content = (
    <div className={`flex flex-col items-center text-center gap-5 ${fullBleed ? 'max-w-[1280px] mx-auto px-6 md:px-12 py-10 md:py-12' : ''}`}>
      <h4 className="text-[26px] md:text-[34px] font-bold text-[#263238] leading-tight">
        Vous avez un besoin spécifique ?
      </h4>
      <p className="text-[16px] md:text-[18px] text-[#4D4D4D] leading-relaxed max-w-[780px]">
        N&apos;hésitez pas à nous solliciter : notre équipe étudie votre demande et vous propose un devis adapté à vos quantités, vos dimensions et vos délais.
      </p>
      <Link
        href="/quote"
        className="bg-[#4CAF4F] text-white text-[16px] font-semibold px-8 py-3.5 rounded-lg shadow-[0_8px_24px_rgba(76,175,79,0.3)] hover:bg-[#43A047] transition-all"
      >
        {t('quote_cta.btn')}
      </Link>
    </div>
  );

  if (fullBleed) {
    return <div id={id} className="bg-[#E8F5E9] w-full">{content}</div>;
  }

  return <div id={id} className="bg-[#E8F5E9] rounded-[28px] p-8 md:p-12">{content}</div>;
}
