import type { Metadata } from 'next';

// Même logique que /cart : « noindex », et pas d'interdiction robots.txt tant que la page peut être indexée.
export const metadata: Metadata = {
  title: 'Validation de la commande',
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
