import { prisma } from '../src/lib/prisma';
const PREFIX = 'TEST-FC-';
async function main() {
  const prodB = await prisma.product.findFirstOrThrow({ where: { reference: `${PREFIX}PB` } });
  const orderCurrent = await prisma.order.create({ data: { ref: `${PREFIX}CURRENT`, status: 'CONTACTE' } });
  await prisma.orderItem.create({ data: { orderId: orderCurrent.id, productId: prodB.id, quantity: 5, unitPrice: 1 } });
  console.log(JSON.stringify({ orderCurrent: orderCurrent.id }));
}
main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
