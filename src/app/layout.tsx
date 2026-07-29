import type { Metadata, Viewport } from "next";
import { Open_Sans, Noto_Serif, Playfair_Display } from "next/font/google";
import "./globals.css";
import { SessionWrapper } from "@/components/SessionWrapper";
import GoogleAnalytics from "./GoogleAnalytics";

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-open-sans" });
const notoSerif = Noto_Serif({ subsets: ["latin"], variable: "--font-noto-serif" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "PSI - Thermal Paper Solutions",
  description: "Premium thermal paper products for businesses across Algeria",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`h-full antialiased ${openSans.variable} ${notoSerif.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
