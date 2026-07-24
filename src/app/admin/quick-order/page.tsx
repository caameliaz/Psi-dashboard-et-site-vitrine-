'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CreateForm, submitNewRequest } from '@/app/admin/requests/page';

// Commande rapide — affiche UNIQUEMENT le formulaire (pas de tableau autour).
// Accessible depuis le bouton rond du menu mobile.
export default function QuickOrderPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [done, setDone] = useState<'Commande' | 'Devis' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/users?assignable=true').then((r) => (r.ok ? r.json() : [])).then(setUsers).catch(() => {});
  }, []);

  const handleSave = async (item: any): Promise<boolean> => {
    const res = await submitNewRequest(item);
    if (!res.ok) { alert(res.error ?? 'Erreur lors de la création'); return false; }
    setDone(res.type);
    return true;
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[70vh] px-6">
        <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mb-5">
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#4CAF4F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="text-[18px] font-bold text-[#0F172A] mb-1">{done} créée</h2>
        <p className="text-[14px] text-[#8A9BB5] mb-6">Elle apparaît dans la liste des demandes.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button onClick={() => setDone(null)} className="px-5 py-2.5 rounded-xl text-[14px] font-bold text-white" style={{ background: '#4CAF4F' }}>
            + Nouvelle demande
          </button>
          <button onClick={() => router.push('/admin/requests')} className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#374151] border border-[#E2E8F0]">
            Voir les commandes
          </button>
        </div>
      </div>
    );
  }

  // Rendu client uniquement (mounted) → évite le mismatch d'hydratation causé par
  // les extensions navigateur (autofill) qui remonteraient les inputs et fermeraient le clavier.
  if (!mounted) return null;

  return (
    <div className="w-full">
      <CreateForm
        inline
        defaultType="Commande"
        onClose={() => router.push('/admin/mobile')}
        onSave={handleSave}
        users={users}
        currentUserId={currentUserId}
      />
    </div>
  );
}
