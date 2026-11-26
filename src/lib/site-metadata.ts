// Métadonnées par défaut du site (reprises par chaque layout racine : public, dashboard, documents).
import type { Metadata, Viewport } from 'next';
import { BRAND, SITE_URL } from '@/lib/i18n/seo';

export const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Les pages publiques donnent leur propre titre, complété par le nom de l'entreprise (« … | SARL Paper Solutions Industry »).
  title: {
    default: BRAND,
    template: `%s | ${BRAND}`,
  },
  description: 'PSI fabrique des rouleaux thermiques pour terminaux de paiement (TPE) et caisses enregistreuses, pour les entreprises en Algérie.',
  openGraph: {
    siteName: BRAND,
    type: 'website',
    locale: 'fr_DZ',
  },
};

// `maximumScale` retiré : bloquer le zoom est un défaut d'accessibilité (relevé par Lighthouse) —
// les utilisateurs malvoyants doivent pouvoir zoomer sur mobile.
export const baseViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
