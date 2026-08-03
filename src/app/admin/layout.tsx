import { AdminShell } from '@/components/AdminShell';
import { RoleProvider } from '@/lib/role-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AdminShell>{children}</AdminShell>
    </RoleProvider>
  );
}
