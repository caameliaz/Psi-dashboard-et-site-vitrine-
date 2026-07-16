import { schedules } from '@trigger.dev/sdk/v3';
import { sendDailyRecap } from '@/lib/recaps/sendDailyRecap';

// Scaffolding uniquement — pas encore relié à un vrai projet Trigger.dev
// (pas de compte/projet créé, pas de nom de domaine pour l'instant).
// Voir README-EMAIL.md pour les étapes de connexion une fois le domaine choisi.
//
// La tâche ne fait qu'appeler sendDailyRecap() — toute la logique (récupération
// des données, envoi) vit dans lib/recaps/ et est testable sans Trigger.dev.

export const dailyRecapTask = schedules.task({
  id: 'daily-recap',
  cron: '0 8 * * *', // tous les jours à 8h (fuseau horaire du projet Trigger.dev, à configurer)
  run: async () => {
    const result = await sendDailyRecap();
    console.log('[trigger] daily-recap', result);
    return result;
  },
});
