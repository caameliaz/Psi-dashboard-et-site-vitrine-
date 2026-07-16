// Script de test manuel pour les récaps email, sans passer par Next.js/Trigger.dev.
// Usage : npx dotenv-cli -e .env -- npx tsx scripts/test-recap.ts daily
//         npx dotenv-cli -e .env -- npx tsx scripts/test-recap.ts weekly

import { sendDailyRecap } from '../src/lib/recaps/sendDailyRecap';
import { sendWeeklyRecap } from '../src/lib/recaps/sendWeeklyRecap';

async function main() {
  const type = process.argv[2];
  if (type !== 'daily' && type !== 'weekly') {
    console.error("Usage: tsx scripts/test-recap.ts <daily|weekly>");
    process.exit(1);
  }

  const result = type === 'daily' ? await sendDailyRecap() : await sendWeeklyRecap();
  console.log(`[${type}]`, result);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
