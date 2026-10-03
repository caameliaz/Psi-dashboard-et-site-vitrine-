import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nos produits : rouleaux thermiques TPE et caisses',
  description: 'Rouleaux thermiques pour terminaux de paiement (TPE) et caisses enregistreuses, fabriqués par PSI. Choisissez vos formats et commandez en ligne.',
  alternates: { canonical: '/products' },
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
