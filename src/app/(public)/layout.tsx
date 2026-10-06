import { Figtree } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import { LangProvider } from '@/lib/i18n';
import GoogleAnalytics from '../GoogleAnalytics';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // GA uniquement sur le site public : l'admin ne doit pas gonfler les visites.
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

  return (
    <LangProvider>
      {gaId && <GoogleAnalytics gaId={gaId} />}
      <script dangerouslySetInnerHTML={{ __html: `try{var l=localStorage.getItem('psi-lang');if(l==='ar'){document.documentElement.dir='rtl';document.documentElement.lang='ar';}}catch(e){}` }} />
      <div className={`${figtree.variable} flex flex-col min-h-screen`} style={{ fontFamily: "var(--font-figtree), var(--font-open-sans), sans-serif" }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />

        <WhatsAppFloat />
      </div>
    </LangProvider>
  );
}
