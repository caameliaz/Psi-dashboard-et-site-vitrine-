import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendDailyRecap } from '@/lib/recaps/sendDailyRecap';
import { sendWeeklyRecap } from '@/lib/recaps/sendWeeklyRecap';

/**
 * Logique commune aux 2 routes cron (quotidien / hebdo).
 *
 * ⚠️ Pourquoi 2 routes séparées et non `?type=daily|weekly` :
 * Vercel identifie un cron par son CHEMIN et ignore la query string —
 * les deux entrées étaient donc vues comme un seul et même cron
 * (seul l'hebdo apparaissait dans le tableau de bord).
 *
 * Sécurité : Vercel envoie l'en-tête "Authorization: Bearer <CRON_SECRET>".
 * Sans le bon secret, la route est refusée (sinon n'importe qui pourrait
 * déclencher des envois d'emails en masse depuis l'extérieur).
 */
/** Réveille la base Neon (endormie après inactivité) — jusqu'à 5 tentatives. */
async function reveillerBase() {
  for (let essai = 1; essai <= 5; essai++) {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      if (essai > 1) console.log(`[CRON] base réveillée après ${essai} tentative(s)`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('[CRON] base toujours injoignable après 5 tentatives');
}

export async function runRecapCron(request: NextRequest, type: 'daily' | 'weekly') {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    // ⚠️ Neon (plan gratuit) endort la base après quelques minutes d'inactivité.
    // Les récaps tournent le soir, souvent après une longue pause → la 1re requête
    // échouerait. On réveille donc la base AVANT de lire les données.
    await reveillerBase();

    const result = type === 'weekly' ? await sendWeeklyRecap() : await sendDailyRecap();
    // Log explicite dans Vercel : on voit d'un coup d'œil si l'email est parti
    // et, sinon, l'erreur exacte renvoyée par le serveur SMTP.
    console.log(
      `[CRON ${type}] envoyés=${result.sent} échecs=${result.failed.length}` +
      (result.failed.length ? ` → ${result.failed.map((f) => `${f.email}: ${f.error}`).join(' | ')}` : ''),
    );
    return NextResponse.json({ type, ...result });
  } catch (e) {
    console.error(`[CRON ${type}]`, e);
    return NextResponse.json({ error: "Échec de l'envoi du récap" }, { status: 500 });
  }
}
