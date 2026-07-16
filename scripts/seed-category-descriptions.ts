// Écrit en base les descriptions qui n'existaient jusqu'ici que côté frontend
// (fallback dans src/lib/hardcodedCatalog.ts), pour que l'admin les voie et
// puisse les éditer depuis le dashboard — la description affichée sur le site
// public vient toujours de Category.description en base.
// Usage : npx dotenv-cli -e .env -- npx tsx scripts/seed-category-descriptions.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DESCRIPTIONS: Record<string, string> = {
  'Papier thermique standard': "Rouleaux de papier thermique haute qualité 55 gr/m², sans BPA, pour tous types d'imprimantes point de vente, terminaux bancaires et caisses enregistreuses.",
  'Étiquettes thermiques': "Étiquettes thermiques adhésives pour l'étiquetage professionnel — compatibles avec les imprimantes à transfert thermique direct, idéales pour la logistique, la pharmacie et la grande distribution.",
};

async function main() {
  for (const [name, description] of Object.entries(DESCRIPTIONS)) {
    const cat = await prisma.category.findUnique({ where: { name } });
    if (!cat) {
      console.log(`Catégorie "${name}" introuvable — ignorée.`);
      continue;
    }
    if (cat.description) {
      console.log(`Catégorie "${name}" a déjà une description — inchangée.`);
      continue;
    }
    await prisma.category.update({ where: { id: cat.id }, data: { description } });
    console.log(`Catégorie "${name}" mise à jour.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
