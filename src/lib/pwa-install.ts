'use client';

import { useSyncExternalStore } from 'react';

// Installation de l'app (PWA) : on n'a pas de bouton « Installer » — on explique la marche à suivre,
// la même idée sur iPhone (Partager → « Sur l'écran d'accueil ») et sur Android (menu ⋮ → « Installer »).

const INSTALLED_KEY = 'psi-pwa-installed';
const DISMISS_KEY = 'psi-pwa-install-dismissed';
const DISMISS_MS = 7 * 24 * 3600_000; // « OK, compris » : on ne redemande pas avant 7 jours

// ios-browser = Chrome/Firefox/Edge sur iPhone (savent aussi ajouter à l'écran d'accueil) ;
// ios-inapp / android-other = navigateur intégré à une appli (WhatsApp, Facebook…) : à ouvrir dans Safari / Chrome.
export type InstallPlatform = 'ios-safari' | 'ios-browser' | 'ios-inapp' | 'android-chrome' | 'android-other';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('appinstalled', () => { localStorage.setItem(INSTALLED_KEY, '1'); notify(); });
}

function isStandalone(): boolean {
  return (navigator as unknown as { standalone?: boolean }).standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
}

// Navigateurs intégrés à une application (WhatsApp, Facebook, Instagram…) : ils ne savent pas installer
const IN_APP = /fban|fbav|fb_iab|instagram|line\/|whatsapp|snapchat|tiktok|; wv\)/i;

function detectPlatform(): InstallPlatform | null {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) {
    if (IN_APP.test(ua)) return 'ios-inapp';
    return /crios|fxios|edgios|opios/i.test(ua) ? 'ios-browser' : 'ios-safari';
  }
  if (/android/i.test(ua)) return IN_APP.test(ua) ? 'android-other' : 'android-chrome';
  return null; // ordinateur : pas concerné
}

type State = { platform: InstallPlatform | null; installed: boolean; dismissed: boolean };

// Instantané sérialisé en texte : useSyncExternalStore compare par valeur, donc pas de re-rendu inutile.
function getSnapshot(): string {
  const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
  const state: State = {
    platform: detectPlatform(),
    installed: isStandalone() || localStorage.getItem(INSTALLED_KEY) === '1',
    dismissed: Date.now() - at < DISMISS_MS,
  };
  return JSON.stringify(state);
}

// Côté serveur : « installée » → rien n'est affiché avant l'hydratation.
const SERVER_SNAPSHOT = JSON.stringify({ platform: null, installed: true, dismissed: true } satisfies State);

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useInstall() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
  const state: State = JSON.parse(snapshot);
  const dismiss = () => { localStorage.setItem(DISMISS_KEY, String(Date.now())); notify(); };
  return { ...state, dismiss };
}
