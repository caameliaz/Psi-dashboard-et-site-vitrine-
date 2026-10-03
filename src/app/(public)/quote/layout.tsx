import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demande de devis',
  description: 'Demandez un devis gratuit pour vos rouleaux thermiques (TPE, caisses enregistreuses). Réponse rapide de l\'équipe PSI, livraison en Algérie.',
  alternates: { canonical: '/quote' },
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
