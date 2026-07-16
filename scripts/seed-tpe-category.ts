// Fait passer la catégorie "Papier pour TPE" du hardcoding (src/lib/hardcodedCatalog.ts)
// à une vraie catégorie en base, avec ses 2 références.
// Usage : npx dotenv-cli -e .env -- npx tsx scripts/seed-tpe-category.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DESCRIPTION = "Petits rouleaux de papier thermique dédiés aux terminaux de paiement mobiles et portatifs, pour une impression de tickets rapide et fiable.";

const REFS = [
  { reference: '57/8', width: 57, length: 8, usage: 'Terminaux de paiement mobiles', price: 150 },
  { reference: '57/15', width: 57, length: 15, usage: 'TPE portatifs, livraison', price: 190 },
];

async function main() {
  const existing = await prisma.category.findUnique({ where: { name: 'Papier pour TPE' } });
  if (existing) {
    console.log('Catégorie "Papier pour TPE" déjà en base (id:', existing.id, ') — rien à faire.');
    return;
  }

  const last = await prisma.category.findFirst({ orderBy: { order: 'desc' } });
  const category = await prisma.category.create({
    data: {
      name: 'Papier pour TPE',
      description: DESCRIPTION,
      order: last ? last.order + 1 : 0,
    },
  });
  console.log('Catégorie créée :', category.id);

  for (const ref of REFS) {
    const product = await prisma.product.create({
      data: { ...ref, categoryId: category.id, active: true },
    });
    console.log('  Référence créée :', product.reference);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
