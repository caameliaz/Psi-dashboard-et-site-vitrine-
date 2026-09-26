// Envoi d'un événement Google Analytics depuis le site public.
// Sans effet si le tag GA n'est pas chargé (admin, GA non configuré, bloqueur de pub).
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag === 'function') gtag('event', name, params);
}
