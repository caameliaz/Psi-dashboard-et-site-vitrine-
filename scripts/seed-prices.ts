import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRICES: Record<string, number> = {
  '57/30': 43,
  '57/40': 80,
  '57/50': 90,
  '80/60': 140,
  '80/75': 0,
  '80/80': 200,
};

async function main() {
  for (const [reference, price] of Object.entries(PRICES)) {
    const result = await prisma.product.updateMany({
      where: { reference },
      data: { price },
    });
    console.log(`${reference} → ${price} DA (${result.count} mis à jour)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
