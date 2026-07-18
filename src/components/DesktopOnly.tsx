'use client';

import Link from 'next/link';
import { useIsMobile } from '@/lib/use-is-mobile';

// Enveloppe une page réservée au desktop. Sur mobile → message + retour au menu.
export function DesktopOnly({ children, title = 'Cette page' }: { children: React.ReactNode; title?: string }) {
  const isMobile = useIsMobile();

  if (isMobile === null) return null; // en attente de mesure

  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[70vh] px-6">
        <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-5">
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none">
            <rect x="2" y="4" width="20" height="13" rx="2" stroke="#3B82F6" strokeWidth="1.8" />
            <path d="M8 21h8M12 17v4" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-[18px] font-bold text-[#0F172A] mb-2">{title} est sur ordinateur</h2>
        <p className="text-[14px] text-[#8A9BB5] max-w-[280px] mb-6">
          Cette vue est optimisée pour grand écran. Ouvrez-la depuis un ordinateur.
        </p>
        <Link href="/admin/mobile" className="px-5 py-2.5 rounded-xl text-[14px] font-bold text-white" style={{ background: '#4CAF4F' }}>
          Retour au menu
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
