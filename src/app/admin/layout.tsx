import { Sidebar } from '@/components/Sidebar';
import { RoleProvider } from '@/lib/role-context';
import { TopBar } from '@/components/ui/TopBar';
import { SSEProvider } from '@/lib/sse-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <SSEProvider>
        <TopBar />
        <div className="flex min-h-screen" style={{ background: '#F5F8FC' }}>
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </SSEProvider>
    </RoleProvider>
  );
}
