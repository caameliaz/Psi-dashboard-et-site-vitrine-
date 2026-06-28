import { Sidebar } from '@/components/Sidebar';
import { RoleProvider } from '@/lib/role-context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleProvider>
      <div className="flex min-h-screen" style={{ background: '#F5F8FC' }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="border-b border-[#E4EBF5]"
            style={{ background: '#FAFCFF', height: 80, minHeight: 80 }}
          />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </RoleProvider>
  );
}
