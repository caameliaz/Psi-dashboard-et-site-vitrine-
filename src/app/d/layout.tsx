import { RootShell } from '@/components/RootShell';
import { baseMetadata, baseViewport } from '@/lib/site-metadata';

// Layout RACINE de cette zone (liens publics à jeton) : le site public a le sien sous app/[lang].
export const metadata = baseMetadata;
export const viewport = baseViewport;

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RootShell>{children}</RootShell>;
}
