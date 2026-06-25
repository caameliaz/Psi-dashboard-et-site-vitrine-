import { SessionProvider } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 bg-zinc-50 p-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
