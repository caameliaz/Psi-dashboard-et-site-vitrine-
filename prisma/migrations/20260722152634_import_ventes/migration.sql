-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "salesRepName" TEXT,
ADD COLUMN     "vatEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "salesRepName" TEXT,
ADD COLUMN     "vatEnabled" BOOLEAN NOT NULL DEFAULT false;
