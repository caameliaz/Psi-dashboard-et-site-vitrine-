-- Product : alertThreshold -> purchaseThreshold + productionThreshold (défaut 70)
ALTER TABLE "Product" ADD COLUMN "purchaseThreshold" INTEGER NOT NULL DEFAULT 70;
ALTER TABLE "Product" ADD COLUMN "productionThreshold" INTEGER NOT NULL DEFAULT 70;
UPDATE "Product" SET "purchaseThreshold" = "alertThreshold", "productionThreshold" = "alertThreshold" WHERE "alertThreshold" IS NOT NULL;
ALTER TABLE "Product" DROP COLUMN "alertThreshold";

-- RawMaterial : alertThreshold -> purchaseThreshold (défaut 70)
ALTER TABLE "RawMaterial" ADD COLUMN "purchaseThreshold" INTEGER NOT NULL DEFAULT 70;
UPDATE "RawMaterial" SET "purchaseThreshold" = "alertThreshold";
ALTER TABLE "RawMaterial" DROP COLUMN "alertThreshold";

-- CreateEnum
CREATE TYPE "PurchaseItemStatus" AS ENUM ('A_COMMANDER', 'COMMANDE', 'RECU');

-- CreateEnum
CREATE TYPE "ProductionItemStatus" AS ENUM ('A_PRODUIRE', 'EN_COURS', 'PRODUIT');

-- CreateTable
CREATE TABLE "PurchaseListItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "rawMaterialId" TEXT,
    "neededQuantity" DOUBLE PRECISION NOT NULL,
    "orderedQuantity" DOUBLE PRECISION,
    "receivedQuantity" DOUBLE PRECISION,
    "status" "PurchaseItemStatus" NOT NULL DEFAULT 'A_COMMANDER',
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionListItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "neededQuantity" DOUBLE PRECISION NOT NULL,
    "producedQuantity" DOUBLE PRECISION,
    "status" "ProductionItemStatus" NOT NULL DEFAULT 'A_PRODUIRE',
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionListItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PurchaseListItem" ADD CONSTRAINT "PurchaseListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseListItem" ADD CONSTRAINT "PurchaseListItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES "RawMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionListItem" ADD CONSTRAINT "ProductionListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
