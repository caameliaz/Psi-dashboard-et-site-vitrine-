-- AlterTable
ALTER TABLE "Order" ADD COLUMN "ref" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "ref" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_ref_key" ON "Order"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_ref_key" ON "Quote"("ref");
