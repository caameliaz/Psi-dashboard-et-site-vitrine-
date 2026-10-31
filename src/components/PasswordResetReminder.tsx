'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const DISMISS_KEY = 'psi-own-password-reminder-dismissed';

// Rappel après connexion : quelqu'un qui a demandé plusieurs fois « Mot de passe oublié » peut choisir lui-même
// son mot de passe (un qu'il retiendra) depuis son profil. Le seuil est décidé côté serveur (GET /api/profile).
// « Plus tard » le masque pour cette session ; il revient à la prochaine connexion tant que le mot de passe n'est
// pas changé (le changement remet le compte à zéro).
export function PasswordResetReminder() {
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) return;
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => { if (u?.suggestOwnPassword) setCount(u.resetCount); })
      .catch(() => {});
  }, []);

  // Sur la page Profil, il est déjà au bon endroit : pas de pop-up par-dessus
  if (count === null || pathname === '/admin/profile') return null;

  const later = () => { sessionStorage.setItem(DISMISS_KEY, '1'); setCount(null); };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl p-5">
        <div className="w-11 h-11 rounded-xl bg-[#F0FDF4] flex items-center justify-center mb-3">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="10" width="16" height="11" rx="2.5" stroke="#4CAF4F" strokeWidth="1.8" />
            <path d="M8 10V7a4 4 0 118 0v3" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-[16px] font-bold text-[#0F172A]">Choisissez votre propre mot de passe</p>
        <p className="text-[13px] text-[#64748B] mt-2">
          Vous avez réinitialisé votre mot de passe plusieurs fois. Pour ne plus avoir à le faire, vous pouvez mettre
          le mot de passe que vous voulez, un que vous retiendrez facilement.
        </p>
        <p className="text-[13px] text-[#64748B] mt-2">
          Allez dans <strong className="text-[#0F172A]">Profil → Changer le mot de passe</strong>. Le « mot de passe actuel »
          est celui que vous venez de recevoir par e-mail.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={later} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#64748B] hover:bg-[#F2F4F7] transition-colors">
            Plus tard
          </button>
          <button onClick={() => { later(); router.push('/admin/profile'); }}
            className="px-4 py-2 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] transition-colors">
            Choisir mon mot de passe
          </button>
        </div>
      </div>
    </div>
  );
}
