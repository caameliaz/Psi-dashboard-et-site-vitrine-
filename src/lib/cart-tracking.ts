// Suivi ANONYME du panier du site public (aucune donnée personnelle) — cf.
// schema.prisma CartSession et src/app/api/cart-tracking/route.ts. `anonId` est un
// identifiant aléatoire généré ici, stocké en localStorage, jamais relié à un client.

const STORAGE_KEY = 'psi_cart_anon_id';

export function getCartAnonId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage indisponible (navigation privée, cookies bloqués…) → pas de suivi,
    // le site continue de fonctionner normalement.
    return null;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Notifie le contenu actuel du panier, avec un léger débounce (pas à chaque frappe/clic). */
export function reportCartChange(itemsCount: number, totalAmount: number) {
  const anonId = getCartAnonId();
  if (!anonId) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetch('/api/cart-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonId, itemsCount, totalAmount }),
      keepalive: true,
    }).catch(() => {});
  }, 800);
}

/** Marque la session panier comme convertie (commande/devis validé). */
export function reportCartConverted() {
  const anonId = getCartAnonId();
  if (!anonId) return;
  fetch('/api/cart-tracking', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anonId }),
    keepalive: true,
  }).catch(() => {});
}
