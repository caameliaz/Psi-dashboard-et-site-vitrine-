import type { Metadata } from 'next';
import { isLang } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/server';

// Même logique que /cart : « noindex », et pas d'interdiction robots.txt tant que la page peut être indexée.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? getDict(lang).meta.checkout_title : 'Validation de la commande', robots: { index: false, follow: false } };
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
