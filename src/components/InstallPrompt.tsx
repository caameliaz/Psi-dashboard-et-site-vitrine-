'use client';

import { useEffect } from 'react';
import { useInstall, type InstallPlatform } from '@/lib/pwa-install';

const INSTRUCTIONS: Record<InstallPlatform, string> = {
  'ios-safari': 'Touchez le bouton Partager (le carré avec une flèche, en bas de Safari), puis « Sur l\'écran d\'accueil ».',
  'ios-browser': 'Touchez le bouton Partager (le carré avec une flèche, dans la barre d\'adresse ou le menu ⋯), puis « Sur l\'écran d\'accueil ». Si vous ne le voyez pas, ouvrez cette page dans Safari.',
  'ios-inapp': 'Ouvrez cette page dans Safari (touchez ⋯ ou l\'icône de boussole, puis « Ouvrir dans Safari »). Ensuite touchez Partager, puis « Sur l\'écran d\'accueil ».',
  'android-chrome': 'Touchez le menu ⋮ du navigateur (en haut à droite), puis « Installer l\'application » (ou « Ajouter à l\'écran d\'accueil »).',
  'android-other': 'Ouvrez cette page dans Chrome (menu ⋮, puis « Ouvrir dans le navigateur »). Ensuite, touchez le menu ⋮ de Chrome, puis « Installer l\'application ».',
};

function AppIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke="#4CAF4F" strokeWidth="1.8" />
      <path d="M12 7v7m0 0l-3-3m3 3l3-3" stroke="#4CAF4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Enregistre le service worker dès l'ouverture de l'admin : sans lui, Chrome/Android ne propose pas
// « Installer l'application » dans son menu (auparavant il n'était enregistré qu'à l'activation des notifications).
function useRegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
}

// Pop-up « Installer l'app » (mobile, tant que l'app n'est pas installée). « OK, compris » la masque 7 jours.
export function InstallPrompt() {
  useRegisterServiceWorker();
  const { platform, installed, dismissed, dismiss } = useInstall();
  if (!platform || installed || dismissed) return null;

  return (
    <div className="md:hidden fixed left-4 right-4 bottom-24 z-[60] bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center flex-shrink-0"><AppIcon /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#0F172A]">Installer l&apos;app PSI</p>
          <p className="text-[12px] text-[#64748B] mt-0.5">{INSTRUCTIONS[platform]}</p>
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <button onClick={dismiss} className="px-4 py-2 rounded-xl text-[13px] font-bold text-white bg-[#4CAF4F] hover:bg-[#43A047] transition-colors">
          OK, compris
        </button>
      </div>
    </div>
  );
}

// Carte « Installer l'application » de la page Profil (mobile) : toujours disponible, même après « OK, compris ».
export function InstallCard() {
  const { platform, installed } = useInstall();
  if (!platform) return null;

  return (
    <div className="md:hidden bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
      <div className="px-4 py-4 border-b border-[#F2F4F7] bg-[#F8FAFC]">
        <h2 className="text-[15px] font-bold text-[#0F172A]">Application</h2>
      </div>
      <div className="px-4 py-4">
        {installed
          ? <p className="text-[13px] text-[#166534] font-semibold">✓ L&apos;app est installée sur cet appareil.</p>
          : <p className="text-[13px] text-[#374151]">{INSTRUCTIONS[platform]}</p>}
      </div>
    </div>
  );
}
