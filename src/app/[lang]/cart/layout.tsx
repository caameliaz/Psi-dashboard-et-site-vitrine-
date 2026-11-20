import type { Metadata } from 'next';
import { isLang } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/server';

// Page sans intérêt pour Google (panier du visiteur) : « noindex » pour la sortir de l'index.
// Elle ne doit PAS être interdite dans robots.txt tant qu'elle est indexée, sinon Google ne peut pas relire cette consigne.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? getDict(lang).meta.cart_title : 'Panier', robots: { index: false, follow: false } };
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
