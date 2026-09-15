-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "priority" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "priority" BOOLEAN NOT NULL DEFAULT false;
