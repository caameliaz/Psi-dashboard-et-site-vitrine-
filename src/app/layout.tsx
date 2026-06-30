import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionWrapper } from "@/components/SessionWrapper";

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
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-full flex flex-col"><SessionWrapper>{children}</SessionWrapper></body>
    </html>
  );
}
