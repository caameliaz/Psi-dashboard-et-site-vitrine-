import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Figtree } from 'next/font/google';
import { RootShell } from '@/components/RootShell';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { LangProvider } from '@/lib/i18n';
import { LANG_META, LOCALES, isLang } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/server';
import { baseMetadata, baseViewport } from '@/lib/site-metadata';
import GoogleAnalytics from '../GoogleAnalytics';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

// Layout RACINE du site public : tout vit sous /[lang] (fr | en | ar). Le français est servi SANS préfixe
// (le proxy réécrit /products → /fr/products), l'anglais et l'arabe sous /en et /ar. Toute autre valeur → 404.
export const dynamicParams = false;
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport = baseViewport;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return baseMetadata;
  return {
    ...baseMetadata,
    description: getDict(lang).meta.site_desc,
    openGraph: { ...baseMetadata.openGraph, locale: LANG_META[lang].ogLocale },
  };
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  // GA uniquement sur le site public : l'admin ne doit pas gonfler les visites.
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  return (
    <RootShell lang={lang}>
      <LangProvider lang={lang}>
        {gaId && <GoogleAnalytics gaId={gaId} />}
        <div className={`${figtree.variable} flex flex-col min-h-screen`} style={{ fontFamily: "var(--font-figtree), var(--font-open-sans), sans-serif" }}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />

          <WhatsAppFloat />
        </div>
      </LangProvider>
    </RootShell>
  );
}
