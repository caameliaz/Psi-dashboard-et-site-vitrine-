-- AlterTable
ALTER TABLE "ProductionListItem" ADD COLUMN     "manualQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseListItem" ADD COLUMN     "manualQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
