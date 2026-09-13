-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "autoAssignStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "assignedEmployeeId" TEXT,
ADD COLUMN     "assignedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "autoAssignStock" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "assignedEmployeeId" TEXT,
ADD COLUMN     "assignedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
