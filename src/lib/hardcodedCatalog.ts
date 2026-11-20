// `originalName` / `descriptionTr` : renseignés quand le catalogue est servi dans une autre langue (cf. lib/i18n/translations) —
// `originalName` = nom français (clé des textes de secours, envoyé tel quel dans les devis), `descriptionTr` = la description est une traduction.
export interface Cat { id: string; name: string; photo: string | null; description?: string | null; quoteOnly?: boolean; photos?: string[]; originalName?: string; descriptionTr?: boolean }
export interface Prod {
  id: string; reference: string; width: number; length: number; usage: string; price: number;
  photo?: string | null; category?: { id: string; name: string; quoteOnly?: boolean } | null;
  customFields?: { value: string; definition: { label: string; originalLabel?: string } }[];
  metrage?: number | null;
}

import type { Lang } from '@/lib/i18n/config';

// Description de secours tant que la catégorie n'a pas de description en base.
// Les catégories viennent de la DB et n'ont qu'un nom en français (pas de modèle
// multilingue côté DB pour l'instant) — seule la description affichée est traduite ici.
const FALLBACK_DESCRIPTIONS_FR: Record<string, string> = {
  'Papier thermique standard': "Rouleaux de papier thermique haute qualité 55 gr/m², sans BPA, pour tous types d'imprimantes point de vente, terminaux bancaires et caisses enregistreuses.",
  'Étiquettes thermiques': "Étiquettes thermiques adhésives pour l'étiquetage professionnel — compatibles avec les imprimantes à transfert thermique direct, idéales pour la logistique, la pharmacie et la grande distribution.",
};

const FALLBACK_DESCRIPTIONS_AR: Record<string, string> = {
  'Papier thermique standard': 'بكرات ورق حراري عالية الجودة 55 غ/م²، خالية من البيسفينول A (BPA)، لجميع أنواع طابعات نقاط البيع وأجهزة الدفع الإلكتروني وصناديق النقد.',
  'Étiquettes thermiques': 'ملصقات حرارية لاصقة للاستخدام المهني — متوافقة مع طابعات النقل الحراري المباشر، مثالية للوجستيك والصيدليات وتجارة التوزيع الكبرى.',
};

const FALLBACK_DESCRIPTIONS_EN: Record<string, string> = {
  'Papier thermique standard': 'High-quality 55 gsm thermal paper rolls, BPA-free, for all types of point-of-sale printers, payment terminals and cash registers.',
  'Étiquettes thermiques': 'Self-adhesive thermal labels for professional labelling — compatible with direct thermal printers, ideal for logistics, pharmacies and large retail.',
};

const FALLBACK_BY_LANG: Record<Lang, Record<string, string>> = {
  fr: FALLBACK_DESCRIPTIONS_FR,
  en: FALLBACK_DESCRIPTIONS_EN,
  ar: FALLBACK_DESCRIPTIONS_AR,
};

export function getFallbackDescription(categoryName: string, lang: Lang): string {
  return FALLBACK_BY_LANG[lang][categoryName] ?? '';
}
