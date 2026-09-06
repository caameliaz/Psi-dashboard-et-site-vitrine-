/*
  Warnings:

  - Made the column `producedQuantity` on table `ProductionListItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orderedQuantity` on table `PurchaseListItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `receivedQuantity` on table `PurchaseListItem` required. This step will fail if there are existing NULL values in that column.

*/
-- Comble d'abord les valeurs NULL existantes (increment sur NULL restait NULL en SQL — la cause
-- du bug "0 produit / 0 reçu affichés" malgré des productions/réceptions déjà faites).
UPDATE "ProductionListItem" SET "producedQuantity" = 0 WHERE "producedQuantity" IS NULL;
UPDATE "PurchaseListItem" SET "orderedQuantity" = 0 WHERE "orderedQuantity" IS NULL;
UPDATE "PurchaseListItem" SET "receivedQuantity" = 0 WHERE "receivedQuantity" IS NULL;

-- AlterTable
ALTER TABLE "ProductionListItem" ALTER COLUMN "producedQuantity" SET NOT NULL,
ALTER COLUMN "producedQuantity" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "PurchaseListItem" ALTER COLUMN "orderedQuantity" SET NOT NULL,
ALTER COLUMN "orderedQuantity" SET DEFAULT 0,
ALTER COLUMN "receivedQuantity" SET NOT NULL,
ALTER COLUMN "receivedQuantity" SET DEFAULT 0;
