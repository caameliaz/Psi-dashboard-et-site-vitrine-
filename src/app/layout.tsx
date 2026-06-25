import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PSI - Thermal Paper Solutions",
  description: "Premium thermal paper products for businesses across Algeria",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
