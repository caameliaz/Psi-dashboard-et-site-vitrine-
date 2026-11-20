-- AlterTable
ALTER TABLE "Order" ADD COLUMN "receiptToken" TEXT NOT NULL DEFAULT (replace((gen_random_uuid())::text, '-'::text, ''::text) || replace((gen_random_uuid())::text, '-'::text, ''::text)),
ADD COLUMN "labelCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "receiptScannedAt" TIMESTAMP(3),
ADD COLUMN "receiptConfirmedAt" TIMESTAMP(3),
ADD COLUMN "receiptSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_receiptToken_key" ON "Order"("receiptToken");

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "receiptToken" TEXT NOT NULL DEFAULT (replace((gen_random_uuid())::text, '-'::text, ''::text) || replace((gen_random_uuid())::text, '-'::text, ''::text)),
ADD COLUMN "labelCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "receiptScannedAt" TIMESTAMP(3),
ADD COLUMN "receiptConfirmedAt" TIMESTAMP(3),
ADD COLUMN "receiptSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_receiptToken_key" ON "Quote"("receiptToken");

