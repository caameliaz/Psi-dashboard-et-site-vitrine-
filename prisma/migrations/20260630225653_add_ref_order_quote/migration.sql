-- AlterTable Order: add ref column
ALTER TABLE "Order" ADD COLUMN "ref" TEXT;
CREATE UNIQUE INDEX "Order_ref_key" ON "Order"("ref");

-- AlterTable Quote: add ref column
ALTER TABLE "Quote" ADD COLUMN "ref" TEXT;
CREATE UNIQUE INDEX "Quote_ref_key" ON "Quote"("ref");
