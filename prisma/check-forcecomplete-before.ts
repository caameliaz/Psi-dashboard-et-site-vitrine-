import { prisma } from '../src/lib/prisma';
const PREFIX = 'TEST-FC-';
async function main() {
  const donor = await prisma.order.findFirst({ where: { ref: `${PREFIX}DONOR` }, include: { items: true } });
  console.log(`DONOR: status=${donor?.status}`, donor?.items.map(i => ({ resolved: i.resolvedQuantity, qty: i.quantity, stockPath: i.stockPath })));
  const prodB = await prisma.product.findFirst({ where: { reference: `${PREFIX}PB` } });
  console.log(`Produit B: available=${prodB?.available} reserved=${prodB?.reserved}`);
}
main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
