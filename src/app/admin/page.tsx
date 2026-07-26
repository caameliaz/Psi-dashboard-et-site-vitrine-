'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Point d'entrée /admin → redirige toujours vers /admin/dashboard (desktop ET mobile)
export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return null;
}
