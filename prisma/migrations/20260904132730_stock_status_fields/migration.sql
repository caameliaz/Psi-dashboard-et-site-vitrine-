-- Product: remplace `stock` par 4 statuts (available/reserved/inDelivery/returned)
ALTER TABLE "Product" ADD COLUMN "available" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "reserved" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "inDelivery" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "returned" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "Product" SET "available" = "stock";
ALTER TABLE "Product" DROP COLUMN "stock";

-- RawMaterial: remplace `stock` par available/reserved
ALTER TABLE "RawMaterial" ADD COLUMN "available" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RawMaterial" ADD COLUMN "reserved" DOUBLE PRECISION NOT NULL DEFAULT 0;
UPDATE "RawMaterial" SET "available" = "stock";
ALTER TABLE "RawMaterial" DROP COLUMN "stock";
