import { Sidebar } from '@/components/Sidebar';
import { RoleProvider } from '@/lib/role-context';
import { TopBar } from '@/components/ui/TopBar';
import { SSEProvider } from '@/lib/sse-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <SSEProvider>
        <div className="flex min-h-screen" style={{ background: '#F5F8FC' }}>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-8">{children}</main>
          </div>
        </div>
      </SSEProvider>
    </RoleProvider>
  );
}
