import { schedules } from '@trigger.dev/sdk/v3';
import { sendWeeklyRecap } from '@/lib/recaps/sendWeeklyRecap';

// Scaffolding uniquement — voir src/trigger/dailyRecap.ts et README-EMAIL.md.

export const weeklyRecapTask = schedules.task({
  id: 'weekly-recap',
  cron: '59 23 * * 4', // le JEUDI à 23h59 (fuseau horaire du projet Trigger.dev, à configurer)
  run: async () => {
    const result = await sendWeeklyRecap();
    console.log('[trigger] weekly-recap', result);
    return result;
  },
});
