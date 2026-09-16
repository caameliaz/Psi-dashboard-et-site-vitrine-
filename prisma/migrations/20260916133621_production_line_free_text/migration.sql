-- AlterTable
ALTER TABLE "ProductionListItem" ADD COLUMN     "description" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;
