'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role-context';

// Redirige vers la première sous-page de Réglages accessible à l'utilisateur.
export default function SettingsIndexPage() {
  const router = useRouter();
  const { can, loading } = useRole();

  useEffect(() => {
    if (loading) return;
    if (can('gerer_utilisateurs')) router.replace('/admin/settings/users');
    else if (can('modifier_contenu')) router.replace('/admin/settings/messages');
    else if (can('voir_historique')) router.replace('/admin/settings/history');
    else router.replace('/admin/dashboard');
  }, [loading, can, router]);

  return null;
}
