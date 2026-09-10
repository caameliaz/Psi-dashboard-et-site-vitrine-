import { prisma } from '../src/lib/prisma';
const PREFIX = 'TEST-FC-';
async function main() {
  const prodA = await prisma.product.findFirstOrThrow({ where: { reference: `${PREFIX}PA` } });
  await prisma.product.update({ where: { id: prodA.id }, data: { available: 10 } });
  console.log('OK');
}
main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
