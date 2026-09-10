import { prisma } from '../src/lib/prisma';

const PREFIX = 'TEST-FC-';

async function main() {
  await prisma.orderItem.deleteMany({ where: { order: { ref: { startsWith: PREFIX } } } });
  await prisma.order.deleteMany({ where: { ref: { startsWith: PREFIX } } });
  await prisma.productionListItem.deleteMany({ where: { product: { reference: { startsWith: PREFIX } } } });
  await prisma.purchaseListItem.deleteMany({ where: { product: { reference: { startsWith: PREFIX } } } });
  await prisma.recipeItem.deleteMany({ where: { product: { reference: { startsWith: PREFIX } } } });
  await prisma.product.deleteMany({ where: { reference: { startsWith: PREFIX } } });
  await prisma.rawMaterial.deleteMany({ where: { reference: { startsWith: PREFIX } } });

  const category = await prisma.category.findFirst() ?? await prisma.category.create({ data: { name: `${PREFIX}CAT` } });

  // ── Test A : disponible couvre tout ──
  const matA = await prisma.rawMaterial.create({ data: { reference: `${PREFIX}MATA`, name: 'mA', unit: 'kg', price: 1, stockMax: 2000, purchaseThreshold: 500, available: 0 } });
  const prodA = await prisma.product.create({ data: { reference: `${PREFIX}PA`, usage: 'x', price: 1, width: 100, length: 100, categoryId: category.id, mode: 'FABRIQUE', stockMax: 100, purchaseThreshold: 50, productionThreshold: 50, available: 0 } });
  await prisma.recipeItem.create({ data: { productId: prodA.id, rawMaterialId: matA.id, quantity: 1 } });
  const orderA = await prisma.order.create({ data: { ref: `${PREFIX}ORDA`, status: 'CONTACTE' } });
  await prisma.orderItem.create({ data: { orderId: orderA.id, productId: prodA.id, quantity: 10, unitPrice: 1 } });

  // ── Test B : vol chez une commande déjà Produite ──
  const matB = await prisma.rawMaterial.create({ data: { reference: `${PREFIX}MATB`, name: 'mB', unit: 'kg', price: 1, stockMax: 2000, purchaseThreshold: 500, available: 0 } });
  const prodB = await prisma.product.create({ data: { reference: `${PREFIX}PB`, usage: 'x', price: 1, width: 100, length: 100, categoryId: category.id, mode: 'FABRIQUE', stockMax: 100, purchaseThreshold: 50, productionThreshold: 50, available: 5 } });
  await prisma.recipeItem.create({ data: { productId: prodB.id, rawMaterialId: matB.id, quantity: 1 } });
  const donorOrder = await prisma.order.create({ data: { ref: `${PREFIX}DONOR`, status: 'CONTACTE' } });
  await prisma.orderItem.create({ data: { orderId: donorOrder.id, productId: prodB.id, quantity: 5, unitPrice: 1 } });

  // ── Test C : rien du tout nulle part ──
  const matC = await prisma.rawMaterial.create({ data: { reference: `${PREFIX}MATC`, name: 'mC', unit: 'kg', price: 1, stockMax: 2000, purchaseThreshold: 500, available: 0 } });
  const prodC = await prisma.product.create({ data: { reference: `${PREFIX}PC`, usage: 'x', price: 1, width: 100, length: 100, categoryId: category.id, mode: 'FABRIQUE', stockMax: 100, purchaseThreshold: 50, productionThreshold: 50, available: 0 } });
  await prisma.recipeItem.create({ data: { productId: prodC.id, rawMaterialId: matC.id, quantity: 1 } });
  const orderC = await prisma.order.create({ data: { ref: `${PREFIX}ORDC`, status: 'CONTACTE' } });
  await prisma.orderItem.create({ data: { orderId: orderC.id, productId: prodC.id, quantity: 10, unitPrice: 1 } });

  console.log(JSON.stringify({
    orderA: orderA.id, prodA: prodA.id,
    donorOrder: donorOrder.id, prodB: prodB.id,
    orderC: orderC.id,
  }, null, 2));
}
main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
