import { auth } from '@/lib/auth';
import { isReadOnly } from '@/lib/permissions';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Écritures qu'un compte « lecture seule » garde le droit de faire : tout ce qui concerne SA session /
// SES notifications (marquer lu, abonnement push), le suivi anonyme du panier et la réinitialisation
// de mot de passe. Tout le reste (créer, modifier, supprimer) est refusé.
const READ_ONLY_ALLOWED = [/^\/api\/activity$/, /^\/api\/cart-tracking/, /^\/api\/notifications\//, /^\/api\/push\//, /^\/api\/password-reset/];

const withAuth = auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!req.auth) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Verrou serveur « lecture seule » : une SEULE garde centrale pour toutes les routes API, au lieu de
  // compter sur chaque route (certaines ne vérifient que la session). Complète le masquage des boutons.
  if (pathname.startsWith('/api/') && !SAFE_METHODS.has(req.method)) {
    const user = req.auth?.user;
    if (user && isReadOnly(user) && !READ_ONLY_ALLOWED.some((re) => re.test(pathname))) {
      return NextResponse.json({ error: 'Compte en lecture seule : modification impossible.' }, { status: 403 });
    }
  }

  return NextResponse.next();
});

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  // Les lectures d'API ne passent pas par `auth()` ici (évite une requête base de plus à chaque GET).
  if (req.nextUrl.pathname.startsWith('/api/') && SAFE_METHODS.has(req.method)) return NextResponse.next();
  return (withAuth as unknown as (r: NextRequest, e: NextFetchEvent) => Promise<Response>)(req, ev);
}

export const config = {
  matcher: ['/admin/:path*', '/api/((?!auth/).*)'],
};
