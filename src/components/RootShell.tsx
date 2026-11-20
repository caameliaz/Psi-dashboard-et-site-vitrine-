import '@/app/globals.css';
import { SessionWrapper } from '@/components/SessionWrapper';
import { inter, notoSerif, openSans, playfairDisplay } from '@/lib/fonts';
import { LANG_META, type Lang } from '@/lib/i18n/config';

// Balises <html>/<body> communes à tous les layouts racine (site public par langue, dashboard, pages de documents).
// `lang` et `dir` sont posés côté serveur : /ar sort en RTL et lang="ar" dès le premier octet de HTML.
export function RootShell({ lang = 'fr', children }: { lang?: Lang; children: React.ReactNode }) {
  return (
    <html
      lang={lang}
      dir={LANG_META[lang].dir}
      className={`h-full antialiased ${openSans.variable} ${notoSerif.variable} ${playfairDisplay.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
