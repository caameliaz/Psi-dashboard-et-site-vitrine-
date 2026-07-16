import { schedules } from '@trigger.dev/sdk/v3';
import { sendWeeklyRecap } from '@/lib/recaps/sendWeeklyRecap';

// Scaffolding uniquement — voir src/trigger/dailyRecap.ts et README-EMAIL.md.

export const weeklyRecapTask = schedules.task({
  id: 'weekly-recap',
  cron: '0 8 * * 1', // le lundi à 8h (fuseau horaire du projet Trigger.dev, à configurer)
  run: async () => {
    const result = await sendWeeklyRecap();
    console.log('[trigger] weekly-recap', result);
    return result;
  },
});
