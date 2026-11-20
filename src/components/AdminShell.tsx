'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/ui/TopBar';
import { DesktopOnly } from '@/components/DesktopOnly';
import { notifBell } from '@/lib/notif-bell-store';
import { PageViewTracker } from '@/components/PageViewTracker';
import { pushSupported, iosNeedsInstall, isPushEnabled, enablePush, disablePush } from '@/lib/push-client';
import Image from 'next/image';
import Link from 'next/link';
import { InstallPrompt } from '@/components/InstallPrompt';
import { PasswordResetReminder } from '@/components/PasswordResetReminder';

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

// Icône mobile à côté de la cloche : active/désactive les notifications système (push) sur cet appareil.
function MobilePushButton() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { isPushEnabled().then(setEnabled); }, []);

  const onClick = async () => {
    if (busy) return;
    if (iosNeedsInstall()) {
      window.alert('Sur iPhone : touchez Partager → « Sur l\'écran d\'accueil », puis ouvrez l\'app depuis l\'icône ajoutée.');
      return;
    }
    if (!pushSupported()) { window.alert('Notifications non supportées sur cet appareil.'); return; }
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        const r = await enablePush();
        if (r === 'ok') setEnabled(true);
        else if (r === 'denied') window.alert('Permission refusée. Autorisez les notifications dans les réglages.');
        else window.alert('Échec de l\'activation. Réessayez.');
      }
    } finally { setBusy(false); }
  };

  return (
    <button
      onClick={onClick}
      aria-label={enabled ? 'Désactiver les notifications système' : 'Activer les notifications système'}
      className={`relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors ${busy ? 'opacity-60' : ''}`}
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
        <rect x="7" y="2" width="10" height="20" rx="2" stroke={enabled ? '#4CAF4F' : '#374151'} strokeWidth="1.6" />
        <path d="M11 18h2" stroke={enabled ? '#4CAF4F' : '#374151'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {!enabled && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F59E0B]" />}
    </button>
  );
}

// Icône profil mobile, à côté de la cloche : ouvre « Mon profil » (infos, mot de passe, déconnexion).
function MobileProfileButton() {
  const pathname = usePathname();
  const active = pathname === '/admin/profile';
  return (
    <Link
      href="/admin/profile"
      aria-label="Mon profil"
      className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors"
    >
      <svg width={20} height={20} fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" stroke={active ? '#4CAF4F' : '#374151'} strokeWidth="1.6" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? '#4CAF4F' : '#374151'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </Link>
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
const DESKTOP_ONLY = ['/admin/products', '/admin/settings'];

// Enveloppe les pages admin : sidebar + contenu, SAUF sur la page de login.
// Responsive : sur mobile la sidebar devient un drawer ouvert par un hamburger.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === '/admin/login';
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Fond blanc sur la page quick-order en mobile, fond gris partout ailleurs
  const isQuickOrder = pathname === '/admin/quick-order';

  if (isLogin) {
    return <>{children}</>;
  }

  const isDesktopOnly = DESKTOP_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <>
      {/* Gère les toasts + le panneau de notifications (pas de barre visible) — toujours monté */}
      <TopBar />
      {/* Journal des pages consultées par les comptes en LECTURE SEULE (visible de la propriétaire uniquement) */}
      <PageViewTracker />
      {/* Pop-up « Installer l'app » (mobile, tant qu'elle n'est pas installée) */}
      <InstallPrompt />
      {/* Rappel « choisissez votre propre mot de passe » après plusieurs réinitialisations */}
      <PasswordResetReminder />
      <div className="flex min-h-screen" style={{ background: isQuickOrder ? '#FFFFFF' : '#F5F8FC' }}>
        {/* Sidebar : fixe sur desktop, drawer sur mobile */}
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header mobile (bouton retour + cloche) — caché sur desktop */}
          <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b border-[#E4EBF5]">
            <button
              onClick={() => router.back()}
              aria-label="Retour"
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[#F2F4F7] transition-colors"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Image 
              src="/logo-psi.webp" 
              alt="PSI" 
              width={65} 
              height={65}
              className="object-contain -mt-1"
            />
            <div className="flex items-center">
              <MobilePushButton />
              <MobileBellButton />
              <MobileProfileButton />
            </div>
          </header>

          {/* Cloche notifications flottante — DESKTOP, visible sur TOUTES les pages (haut à droite) */}
          <DesktopBellButton />

          {/* pt/pr en plus sur desktop pour réserver la place de la cloche flottante */}
          <main className={`flex-1 min-w-0 ${isQuickOrder ? 'p-0 md:p-8 md:pt-14' : 'p-4 md:p-8 md:pt-14'}`}>
            {isDesktopOnly ? <DesktopOnly>{children}</DesktopOnly> : children}
          </main>
        </div>
      </div>
    </>
  );
}
