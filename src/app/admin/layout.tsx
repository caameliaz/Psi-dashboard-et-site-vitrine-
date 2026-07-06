import { Sidebar } from '@/components/Sidebar';
import { RoleProvider } from '@/lib/role-context';
import { SSEProvider } from '@/lib/sse-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <SSEProvider>
        <div className="flex min-h-screen" style={{ background: '#F5F8FC' }}>
          <Sidebar />
          <main className="flex-1 min-w-0 p-8">{children}</main>
        </div>
      </SSEProvider>
    </RoleProvider>
  );
}
