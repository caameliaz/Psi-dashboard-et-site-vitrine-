'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/ui/TopBar';
import { DesktopOnly } from '@/components/DesktopOnly';
import { notifBell } from '@/lib/notif-bell-store';
import Image from 'next/image';

// Cloche mobile — même source de données que la cloche du dashboard PC
// (store partagé notifBell, alimenté par TopBar).
function MobileBellButton() {
  const [unread, setUnread] = useState(() => notifBell.getCount());
  useEffect(() => notifBell.subscribe(setUnread), []);
  return (
    <button
      onClick={() => notifBell.open()}
      aria-label="Notifications"
      className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors"
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
          stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {unread > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#3B82F6] flex items-center justify-center">
          <span className="text-[9px] font-bold text-white leading-none">{unread > 99 ? '99+' : unread}</span>
        </span>
      )}
    </button>
  );
}

// Cloche flottante en haut à droite, sur TOUTES les pages admin (desktop uniquement).
function DesktopBellButton() {
  const [unread, setUnread] = useState(() => notifBell.getCount());
  useEffect(() => notifBell.subscribe(setUnread), []);
  return (
    <button
      onClick={() => notifBell.open()}
      aria-label="Notifications"
      className="hidden md:flex fixed top-3 right-3 z-50 w-10 h-10 items-center justify-center rounded-full bg-white border border-[#E4EBF5] shadow-md hover:bg-[#F8FAFC] transition-colors"
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
          stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#3B82F6] flex items-center justify-center">
          <span className="text-[9px] font-bold text-white leading-none">{unread > 99 ? '99+' : unread}</span>
        </span>
      )}
    </button>
  );
}

// Pages réservées au desktop (lourdes / peu utiles sur le terrain).
// Sur mobile, elles affichent un message + retour au menu.
const DESKTOP_ONLY = ['/admin/products', '/admin/content', '/admin/templates', '/admin/users', '/admin/history', '/admin/profile'];

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
    <>
      {/* Gère les toasts + le panneau de notifications (pas de barre visible) — toujours monté */}
      <TopBar />
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
            <Image 
              src="/Logo PSI-new.jpeg" 
              alt="PSI" 
              width={65} 
              height={65}
              className="object-contain -mt-1"
            />
            <MobileBellButton />
          </header>

          {/* Cloche notifications flottante — DESKTOP, visible sur TOUTES les pages (haut à droite) */}
          <DesktopBellButton />

          {/* pt/pr en plus sur desktop pour réserver la place de la cloche flottante */}
          <main className="flex-1 min-w-0 p-4 md:p-8 md:pt-14">
            {isDesktopOnly ? <DesktopOnly>{children}</DesktopOnly> : children}
          </main>
        </div>
      </div>
    </>
  );
}
