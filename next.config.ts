import type { NextConfig } from "next";
import os from "os";

// Détecte automatiquement toutes les IP locales du PC (WiFi, Ethernet, partage
// de connexion…) → autorisées pour le HMR en dev. Ainsi, quel que soit le réseau
// (WiFi maison, 4G partagée, autre lieu), le test sur mobile marche sans rien changer.
function localIPs(): string[] {
  const ips = new Set<string>(['localhost', '127.0.0.1']);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.add(net.address);
    }
  }
  return [...ips];
}

const nextConfig: NextConfig = {
  // Toutes les IP locales du PC + localhost (recalculé à chaque démarrage de `npm run dev`).
  allowedDevOrigins: localIPs(),

  // ── En-têtes de sécurité (appliqués à toutes les pages) ──────────────────
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Empêche l'intégration du site dans une iframe (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Empêche le navigateur de "deviner" le type de contenu (MIME sniffing)
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Ne fuit pas l'URL complète vers les sites externes
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Bloque l'accès caméra/micro/géoloc par défaut
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Force le HTTPS pendant 2 ans (HSTS) — actif seulement quand servi en HTTPS (prod)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
