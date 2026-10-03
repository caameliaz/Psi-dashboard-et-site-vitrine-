import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez PSI : téléphone, WhatsApp, e-mail et adresse à Chéraga (Alger). Nous répondons à vos questions sur nos rouleaux thermiques.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
