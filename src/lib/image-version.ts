// Empreinte courte d'une image (data URL base64) pour l'ajouter en `?v=` à son URL : quand l'image
// change, l'URL change, donc le cache long du navigateur/CDN ne peut jamais servir l'ancienne.
// FNV-1a 32 bits — rapide même sur des centaines de Ko, collisions négligeables ici.
export function imageVersion(dataUrl: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < dataUrl.length; i++) {
    h ^= dataUrl.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Réponse HTTP d'une data URL (image/xxx;base64) en vrai fichier image, cachée 24 h (l'URL est versionnée).
export function dataUrlToImageResponse(dataUrl: string | null | undefined): Response {
  const m = dataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
  if (!m) return new Response(null, { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' },
  });
}
