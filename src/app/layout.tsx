import type { Metadata, Viewport } from "next";
import { Open_Sans, Noto_Serif, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { SessionWrapper } from "@/components/SessionWrapper";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
// « Google Sans » n'est pas distribuée publiquement (police interne Google, absente de Google
// Fonts) — Inter est l'alternative la plus proche visuellement et librement utilisable.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Domaine canonique (cf. sitemap.ts / robots.ts) : sert à fabriquer les URL absolues des métadonnées.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.psi.dz';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Les pages publiques donnent leur propre titre, complété par le nom de l'entreprise (« … | SARL Paper Solutions Industry »).
  title: {
    default: 'SARL Paper Solutions Industry',
    template: '%s | SARL Paper Solutions Industry',
  },
  description: 'PSI fabrique des rouleaux thermiques pour terminaux de paiement (TPE) et caisses enregistreuses, pour les entreprises en Algérie.',
  openGraph: {
    siteName: 'SARL Paper Solutions Industry',
    type: 'website',
    locale: 'fr_DZ',
  },
};

// `maximumScale` retiré : bloquer le zoom est un défaut d'accessibilité (relevé par Lighthouse) —
// les utilisateurs malvoyants doivent pouvoir zoomer sur mobile.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${openSans.variable} ${notoSerif.variable} ${playfairDisplay.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
