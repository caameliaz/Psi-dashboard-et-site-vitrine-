-- Nouveaux statuts de commande/devis : PRODUITE (avant Livré), RETOURNE (après Livré)
ALTER TYPE "RequestStatus" ADD VALUE 'PRODUITE' BEFORE 'LIVRE';
ALTER TYPE "RequestStatus" ADD VALUE 'RETOURNE' AFTER 'LIVRE';

-- Nouveau statut de ligne de production : bloqué en attente de matière première
ALTER TYPE "ProductionItemStatus" ADD VALUE 'BLOQUE' AFTER 'A_PRODUIRE';

-- CreateEnum
CREATE TYPE "ItemStockPath" AS ENUM ('NONE', 'FROM_STOCK', 'IN_PRODUCTION', 'PURCHASE_PENDING');

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "stockPath" "ItemStockPath" NOT NULL DEFAULT 'NONE';
ALTER TABLE "OrderItem" ADD COLUMN "resolvedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN "purchaseListItemId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productionListItemId" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_purchaseListItemId_fkey" FOREIGN KEY ("purchaseListItemId") REFERENCES "PurchaseListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productionListItemId_fkey" FOREIGN KEY ("productionListItemId") REFERENCES "ProductionListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable QuoteItem
ALTER TABLE "QuoteItem" ADD COLUMN "stockPath" "ItemStockPath" NOT NULL DEFAULT 'NONE';
ALTER TABLE "QuoteItem" ADD COLUMN "resolvedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "QuoteItem" ADD COLUMN "purchaseListItemId" TEXT;
ALTER TABLE "QuoteItem" ADD COLUMN "productionListItemId" TEXT;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_purchaseListItemId_fkey" FOREIGN KEY ("purchaseListItemId") REFERENCES "PurchaseListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_productionListItemId_fkey" FOREIGN KEY ("productionListItemId") REFERENCES "ProductionListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
