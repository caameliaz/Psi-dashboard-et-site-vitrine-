import type { Metadata } from 'next';

// Page sans intérêt pour Google (panier du visiteur) : « noindex » pour la sortir de l'index.
// Elle ne doit PAS être interdite dans robots.txt tant qu'elle est indexée, sinon Google ne peut pas relire cette consigne.
export const metadata: Metadata = {
  title: 'Panier',
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
