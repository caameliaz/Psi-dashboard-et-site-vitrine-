// Anti brute-force partagé (login mot de passe + vérification du code 2FA).
// En mémoire, par email. 5 échecs → blocage 15 min. Réinitialisé au succès.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map<string, number[]>();

function key(scope: string, email: string) {
  return `${scope}:${email.toLowerCase()}`;
}

export function isBlocked(scope: string, email: string): boolean {
  const k = key(scope, email);
  const now = Date.now();
  const arr = (fails.get(k) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(k, arr);
  return arr.length >= MAX_ATTEMPTS;
}

export function recordFail(scope: string, email: string) {
  const k = key(scope, email);
  const now = Date.now();
  const arr = (fails.get(k) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  fails.set(k, arr);
}

export function recordSuccess(scope: string, email: string) {
  fails.delete(key(scope, email));
}
