import { auth } from '@/lib/auth';
import { isReadOnly } from '@/lib/permissions';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';
import { LANG_COOKIE } from '@/lib/i18n/config';

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

// ── Langues du site public ───────────────────────────────────────────────────
// Toutes les pages publiques vivent sous app/[lang]. Le français (langue par défaut) garde des adresses SANS
// préfixe : /products est réécrit EN INTERNE vers /fr/products (l'adresse affichée ne change pas). L'anglais et
// l'arabe sont sous /en et /ar. Un visiteur qui a choisi une langue (cookie) y est ramené s'il arrive sur une
// adresse sans préfixe ; les robots n'ont pas de cookie, ils voient donc toujours chaque version à son adresse.
function publicLocale(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split('/')[1];

  // /en, /ar : déjà une adresse de langue
  if (first === 'en' || first === 'ar') return NextResponse.next();

  // /fr/... : une seule adresse canonique par page → on redirige vers la version sans préfixe
  if (first === 'fr') {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(url, 308);
  }

  // Adresse sans préfixe : langue mémorisée (en / ar) → redirection ; sinon français
  const saved = req.cookies.get(LANG_COOKIE)?.value;
  if (saved === 'en' || saved === 'ar') {
    const url = req.nextUrl.clone();
    url.pathname = `/${saved}${pathname === '/' ? '' : pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 307);
  }
  const url = req.nextUrl.clone();
  url.pathname = `/fr${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  const { pathname } = req.nextUrl;
  // Pages publiques (tout sauf admin / api / d / r / fichiers) : gestion des langues uniquement
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/')) return publicLocale(req);
  // Les lectures d'API ne passent pas par `auth()` ici (évite une requête base de plus à chaque GET).
  if (pathname.startsWith('/api/') && SAFE_METHODS.has(req.method)) return NextResponse.next();
  return (withAuth as unknown as (r: NextRequest, e: NextFetchEvent) => Promise<Response>)(req, ev);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/((?!auth/).*)',
    // Pages publiques : on exclut les pages à jeton (d, r), les fichiers (avec extension), l'API déjà gérée ci-dessus et _next.
    '/((?!api/|admin|_next/|d/|r/|.*\\..*).*)',
  ],
};
