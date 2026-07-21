'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/lib/use-is-mobile';
import { useRole } from '@/lib/role-context';
import { pushSupported, isPushEnabled, enablePush, disablePush } from '@/lib/push-client';

// Bouton compact d'activation des notifications système (pour le terrain)
function PushButtonMobile() {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { setSupported(pushSupported()); isPushEnabled().then(setEnabled); }, []);

  const toggle = async () => {
    setBusy(true); setMsg('');
    try {
      if (enabled) { await disablePush(); setEnabled(false); setMsg('Notifications désactivées.'); }
      else {
        const r = await enablePush();
        if (r === 'ok') { setEnabled(true); setMsg('Activées ! Même app fermée.'); }
        else if (r === 'denied') setMsg('Permission refusée (réglages navigateur).');
        else if (r === 'unsupported') setMsg('Sur iPhone : ajoutez le site à l\'écran d\'accueil d\'abord.');
        else setMsg('Échec, réessayez.');
      }
    } finally { setBusy(false); }
  };

  if (!supported) return null;
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-2">
      <button onClick={toggle} disabled={busy}
        className={`w-full h-12 rounded-2xl text-[14px] font-bold transition-all active:scale-[0.98] ${enabled ? 'bg-white border border-[#E4EBF5] text-[#EF4444]' : 'text-white'} disabled:opacity-60`}
        style={enabled ? undefined : { background: '#4CAF4F' }}>
        {busy ? '…' : enabled ? '🔕 Désactiver les notifications' : '🔔 Activer les notifications'}
      </button>
      {msg && <p className="text-[12px] text-[#8A9BB5] text-center">{msg}</p>}
    </div>
  );
}

// Menu d'accueil MOBILE — 1 bouton rond "+" (nouvelle commande) + 2 rectangles.
export default function MobileHome() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { can } = useRole();

  useEffect(() => {
    if (isMobile === false) router.replace('/admin/dashboard');
  }, [isMobile, router]);

  if (isMobile !== true) return null;

  const canCommandes = can('voir_commandes');
  const canClients = can('voir_clients');

  return (
    <div className="flex flex-col items-center justify-center gap-8 min-h-[calc(100vh-8rem)]">
      {/* Bouton rond — Nouvelle commande (action principale) */}
      {canCommandes && (
        <Link
          href="/admin/quick-order"
          className="flex flex-col items-center gap-3 active:scale-[0.97] transition-transform"
        >
          <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(76,175,79,0.55)]" style={{ background: '#4CAF4F' }}>
            <svg width={38} height={38} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </div>
          <span className="text-[15px] font-bold text-[#0F172A]">Nouvelle commande</span>
        </Link>
      )}

      {/* 2 cartes épurées — Clients & Commandes (blanc + bordure + icône colorée) */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {canClients && (
          <Link
            href="/admin/clients"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl h-32 bg-white border border-[#E4EBF5] shadow-sm active:scale-[0.97] active:border-[#4CAF4F] transition-all"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.2" stroke="#3B82F6" strokeWidth="1.8" /><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <span className="text-[14px] font-bold text-[#0F172A]">Clients</span>
          </Link>
        )}
        {canCommandes && (
          <Link
            href="/admin/requests"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl h-32 bg-white border border-[#E4EBF5] shadow-sm active:scale-[0.97] active:border-[#4CAF4F] transition-all"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#F5F3FF' }}>
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2.5" stroke="#8B5CF6" strokeWidth="1.8" /><path d="M8 8h8M8 12h8M8 16h5" stroke="#8B5CF6" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <span className="text-[14px] font-bold text-[#0F172A]">Commandes</span>
          </Link>
        )}
      </div>

      <PushButtonMobile />
    </div>
  );
}
