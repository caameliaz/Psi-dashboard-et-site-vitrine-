'use client';

import { SessionProvider } from 'next-auth/react';

export function SessionWrapper({ children }: { children: React.ReactNode }) {
  // refetchOnWindowFocus désactivé : sur mobile, chaque frappe déclenche des
  // events focus/blur → sinon la session se re-fetch et re-render tout l'arbre,
  // ce qui remonte les inputs et FERME le clavier. refetchInterval=0 = pas de poll.
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      {children}
    </SessionProvider>
  );
}
