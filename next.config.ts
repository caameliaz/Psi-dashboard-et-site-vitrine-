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
};

export default nextConfig;
