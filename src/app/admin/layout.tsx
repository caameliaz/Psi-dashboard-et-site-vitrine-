import type { Metadata } from 'next';
import { AdminShell } from '@/components/AdminShell';
import { RoleProvider } from '@/lib/role-context';

// PWA : uniquement le dashboard admin est installable (site public non concerné) —
// ce `metadata` se fusionne avec celui du layout racine sans le remplacer.
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PSI Dashboard',
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AdminShell>{children}</AdminShell>
    </RoleProvider>
  );
}
