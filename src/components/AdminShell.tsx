'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { NotifBell } from '@/components/ui/NotifBell';
import { DesktopOnly } from '@/components/DesktopOnly';

// Pages réservées au desktop (lourdes / peu utiles sur le terrain).
// Sur mobile, elles affichent un message + retour au menu.
const DESKTOP_ONLY = ['/admin/dashboard', '/admin/products', '/admin/content', '/admin/users', '/admin/history'];

// Enveloppe les pages admin : sidebar + contenu, SAUF sur la page de login.
// Responsive : sur mobile la sidebar devient un drawer ouvert par un hamburger.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLogin) {
    return <>{children}</>;
  }

  const isDesktopOnly = DESKTOP_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <div className="flex min-h-screen" style={{ background: '#F5F8FC' }}>
      {/* Sidebar : fixe sur desktop, drawer sur mobile */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header mobile (hamburger + cloche) — caché sur desktop */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-[#E4EBF5]">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors"
          >
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-[14px] font-bold text-[#0F172A]">PSI</span>
          <NotifBell />
        </header>

        <main className="flex-1 min-w-0 p-4 md:p-8">
          {isDesktopOnly ? <DesktopOnly>{children}</DesktopOnly> : children}
        </main>
      </div>
    </div>
  );
}
