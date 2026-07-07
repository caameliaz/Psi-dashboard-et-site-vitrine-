import { AdminShell } from '@/components/AdminShell';
import { RoleProvider } from '@/lib/role-context';
import { SSEProvider } from '@/lib/sse-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <SSEProvider>
        <AdminShell>{children}</AdminShell>
      </SSEProvider>
    </RoleProvider>
  );
}
