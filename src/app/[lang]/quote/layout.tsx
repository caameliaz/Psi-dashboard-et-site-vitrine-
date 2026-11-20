import type { Metadata } from 'next';
import { isLang } from '@/lib/i18n/config';
import { getDict } from '@/lib/i18n/server';
import { localizedMetadata } from '@/lib/i18n/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const m = getDict(lang).meta;
  return localizedMetadata(lang, '/quote', { title: m.quote_title, description: m.quote_desc });
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
