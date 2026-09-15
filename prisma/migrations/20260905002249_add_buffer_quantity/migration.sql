-- AlterTable
ALTER TABLE "ProductionListItem" ADD COLUMN     "bufferQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseListItem" ADD COLUMN     "bufferQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
