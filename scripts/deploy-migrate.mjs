/**
 * Migration au déploiement, robuste face à la mise en veille de Neon.
 *
 * ⚠️ Problème résolu ici :
 * la base Neon (plan gratuit) s'endort après quelques minutes. `prisma migrate
 * deploy` échouait alors sur un timeout de 10 s (P1002) EN LAISSANT le verrou
 * d'avis (advisory lock) pris → tous les déploiements suivants échouaient à leur
 * tour, jusqu'à libération manuelle du verrou.
 *
 * On réveille donc la base AVANT de migrer, et on réessaie si besoin.
 */
import { execSync } from 'node:child_process';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reveillerBase() {
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  for (let essai = 1; essai <= 6; essai++) {
    try {
      await p.$queryRawUnsafe('SELECT 1');
      console.log(`[migrate] base réveillée (essai ${essai})`);
      await p.$disconnect();
      return true;
    } catch {
      console.log(`[migrate] base endormie, nouvelle tentative (${essai}/6)…`);
      await sleep(5000);
    }
  }
  await p.$disconnect().catch(() => {});
  console.log('[migrate] base toujours injoignable — on tente la migration quand même');
  return false;
}

await reveillerBase();

// La base est réveillée : la migration peut prendre son verrou sans timeout.
for (let essai = 1; essai <= 3; essai++) {
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    // ⚠️ Indispensable : Vercel réutilise un cache de build entre déploiements.
    // Sans cette régénération, le client Prisma reste celui d'AVANT l'ajout de
    // nouveaux champs → erreurs "does not exist in type ...CreateInput".
    console.log('[migrate] régénération du client Prisma…');
    execSync('npx prisma generate', { stdio: 'inherit' });
    process.exit(0);
  } catch {
    if (essai === 3) {
      console.error('[migrate] échec après 3 tentatives');
      process.exit(1);
    }
    console.log(`[migrate] échec, nouvelle tentative (${essai}/3)…`);
    await sleep(8000);
  }
}
