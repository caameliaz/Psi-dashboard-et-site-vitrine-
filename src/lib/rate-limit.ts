import { NextRequest, NextResponse } from 'next/server';

// Rate limiter simple en mémoire (suffisant pour l'échelle PSI, 1 seul serveur).
// Pour du multi-instance, remplacer par Upstash/Redis. Fenêtre glissante par IP.
const hits = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Nettoyage périodique pour éviter que la Map grossisse indéfiniment
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, arr] of hits) {
    const kept = arr.filter((t) => now - t < windowMs);
    if (kept.length === 0) hits.delete(key);
    else hits.set(key, kept);
  }
}

/**
 * Vérifie la limite. Retourne une réponse 429 si dépassée, sinon null.
 * @param req      la requête
 * @param key      identifiant du groupe de limite (ex: 'orders', 'login')
 * @param max      nombre max de requêtes
 * @param windowMs fenêtre en ms
 */
export function rateLimit(req: NextRequest, key: string, max: number, windowMs: number): NextResponse | null {
  const id = `${key}:${clientIp(req)}`;
  const now = Date.now();
  const arr = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(id, arr);
  sweep(windowMs);

  if (arr.length > max) {
    const retryAfter = Math.ceil(windowMs / 1000);
    return NextResponse.json(
      { error: 'Trop de tentatives. Veuillez réessayer dans un instant.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }
  return null;
}
