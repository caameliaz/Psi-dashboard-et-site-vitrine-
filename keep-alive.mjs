// Keep-alive : pingue /api/ping toutes les 4 min pour garder Neon réveillée.
// Lancer : node keep-alive.mjs  (garder la fenêtre ouverte pendant tests/démo)
const URL = process.env.PING_URL || 'http://localhost:3000/api/ping';
const INTERVAL = 4 * 60 * 1000; // 4 minutes

async function ping() {
  const t = new Date().toLocaleTimeString('fr-FR');
  try {
    const res = await fetch(URL);
    const j = await res.json().catch(() => ({}));
    console.log(`[${t}] ping ${URL} → ${res.status} ${j.ok ? '✓ base réveillée' : ''}`);
  } catch (e) {
    console.log(`[${t}] ping échoué: ${e.message}`);
  }
}

console.log(`🔄 Keep-alive démarré — ping toutes les 4 min sur ${URL}`);
console.log('   (garde cette fenêtre ouverte pendant tes tests et la démo)');
ping();
setInterval(ping, INTERVAL);
