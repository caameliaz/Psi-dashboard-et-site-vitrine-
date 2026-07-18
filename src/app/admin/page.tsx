'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/use-is-mobile';

// Point d'entrée /admin → dashboard sur desktop, menu terrain sur mobile.
export default function AdminPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile === null) return;
    router.replace(isMobile ? '/admin/mobile' : '/admin/dashboard');
  }, [isMobile, router]);

  return null;
}
