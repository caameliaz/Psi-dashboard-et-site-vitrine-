-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "priceIncludesVat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quote" ADD COLUMN     "priceIncludesVat" BOOLEAN NOT NULL DEFAULT false;

-- Ventes importées (source AUTRE) : montants du fichier déjà TTC.
-- Au 27/09/2026, toutes les commandes/devis existants avec source AUTRE viennent de l'import.
UPDATE "Order" SET "priceIncludesVat" = true WHERE "source" = 'AUTRE';
UPDATE "Quote" SET "priceIncludesVat" = true WHERE "source" = 'AUTRE';
