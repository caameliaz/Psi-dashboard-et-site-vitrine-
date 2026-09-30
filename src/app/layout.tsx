import type { Metadata, Viewport } from "next";
import { Open_Sans, Noto_Serif, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SessionWrapper } from "@/components/SessionWrapper";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "PSI - Thermal Paper Solutions",
  description: "PSI fabrique et fournit du papier thermique premium (rouleaux de caisse, étiquettes thermiques) pour les entreprises en Algérie.",
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
    <html lang="fr" className={`h-full antialiased ${openSans.variable} ${notoSerif.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
