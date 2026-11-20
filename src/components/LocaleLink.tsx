'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useTranslation } from '@/lib/i18n';
import { localePath } from '@/lib/i18n/config';

// <Link> du site public : ajoute le préfixe de la langue courante aux adresses internes
// (/products → /en/products). Les liens externes, ancres seules, mailto:/tel: et chemins du
// dashboard sont laissés tels quels. Hors site public (pas de LangProvider) : français, rien ne change.
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { lang } = useTranslation();
  return <NextLink href={typeof href === 'string' ? localePath(href, lang) : href} {...props} />;
}
