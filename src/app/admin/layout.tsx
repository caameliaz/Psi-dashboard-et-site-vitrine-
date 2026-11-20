import type { Metadata } from 'next';
import { AdminShell } from '@/components/AdminShell';
import { RootShell } from '@/components/RootShell';
import { RoleProvider } from '@/lib/role-context';
import { baseMetadata, baseViewport } from '@/lib/site-metadata';

// Layout RACINE du dashboard (le site public a le sien sous app/[lang]).
// PWA : uniquement le dashboard admin est installable (site public non concerné).
export const metadata: Metadata = {
  ...baseMetadata,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PSI Dashboard',
  },
};
export const viewport = baseViewport;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell>
      <RoleProvider>
        <AdminShell>{children}</AdminShell>
      </RoleProvider>
    </RootShell>
  );
}
