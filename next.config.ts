import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise tout le réseau local à charger les scripts de dev (test sur mobile,
  // quelle que soit l'IP du WiFi). Couvre les plages privées 192.168.x.x et 10.x.x.x.
  allowedDevOrigins: [
    '192.168.0.0/16',
    '10.0.0.0/8',
    '172.16.0.0/12',
  ],
};

export default nextConfig;
