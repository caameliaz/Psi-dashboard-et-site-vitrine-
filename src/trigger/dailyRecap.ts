// ⚠️ RÉCAP QUOTIDIEN DÉSACTIVÉ (décision entreprise) — on ne garde que l'hebdo.
// Le job planifié est retiré : plus d'envoi automatique quotidien.
// La fonction sendDailyRecap() reste disponible (route /api/dev/send-recap?type=daily)
// pour un test manuel si besoin, mais elle n'est plus déclenchée par un cron.
//
// Pour réactiver un jour : décommenter le bloc ci-dessous.

// import { schedules } from '@trigger.dev/sdk/v3';
// import { sendDailyRecap } from '@/lib/recaps/sendDailyRecap';
//
// export const dailyRecapTask = schedules.task({
//   id: 'daily-recap',
//   cron: '0 8 * * *',
//   run: async () => {
//     const result = await sendDailyRecap();
//     console.log('[trigger] daily-recap', result);
//     return result;
//   },
// });

export {};
