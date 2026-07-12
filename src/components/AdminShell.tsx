'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/ui/TopBar';

// Enveloppe les pages admin : sidebar + contenu, SAUF sur la page de login
// (où l'on n'est pas connecté, donc pas de sidebar et pleine page).
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <>
      <TopBar />
      <div className="flex min-h-screen" style={{ background: '#F5F8FC' }}>
        <Sidebar />
        <main className="flex-1 min-w-0 p-8">{children}</main>
      </div>
    </>
  );
}
