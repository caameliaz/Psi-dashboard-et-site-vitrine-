'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export function MobileNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin/dashboard') {
      return pathname === '/admin/dashboard';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      {/* Mobile Bottom Navbar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-[#4CAF4F] rounded-3xl shadow-2xl z-50 overflow-hidden">
        <div className="flex items-center justify-around px-2 py-3">
          {/* Dashboard */}
          <Link href="/admin/dashboard" className="flex flex-col items-center gap-1 relative">
            {isActive('/admin/dashboard') && (
              <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-b-full" />
            )}
            <Image 
              src="/icons8-statistique-96.png" 
              alt="Dashboard" 
              width={24} 
              height={24}
              className="brightness-0 invert"
            />
            <span className="text-[10px] font-bold text-white">Dashboard</span>
          </Link>

          {/* Créer - Mène vers quick-order comme le gros plus */}
          <Link 
            href="/admin/quick-order" 
            className="flex flex-col items-center gap-1 relative"
          >
            {isActive('/admin/quick-order') && (
              <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-b-full" />
            )}
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[10px] font-bold text-white">Créer</span>
          </Link>

          {/* Commandes */}
          <Link href="/admin/requests" className="flex flex-col items-center gap-1 relative">
            {isActive('/admin/requests') && (
              <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-b-full" />
            )}
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-bold text-white">Commandes</span>
          </Link>

          {/* Clients */}
          <Link href="/admin/clients" className="flex flex-col items-center gap-1 relative">
            {isActive('/admin/clients') && (
              <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-12 h-1 bg-white rounded-b-full" />
            )}
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[10px] font-bold text-white">Clients</span>
          </Link>
        </div>
      </div>

      {/* Spacer pour éviter que le contenu ne soit caché par la navbar sur mobile */}
      <div className="md:hidden h-20" />
    </>
  );
}
