-- Numéro de facture réservé dès que la TVA est activée, BL « avec facture » (BL-F) distincts des BL sans facture.

-- Commandes / devis : pastille « R » quand le numéro a été réattribué après une annulation
ALTER TABLE "Order" ADD COLUMN "invoiceNumberReused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quote" ADD COLUMN "invoiceNumberReused" BOOLEAN NOT NULL DEFAULT false;

-- Documents : BL avec facture (numéro = celui de la facture) ou sans facture (compteur propre)
ALTER TABLE "Document" ADD COLUMN "withInvoice" BOOLEAN NOT NULL DEFAULT false;

-- Compteurs : plancher en dessous duquel aucun numéro n'est réattribué.
-- Pour les compteurs existants, tout ce qui a déjà été émis (≤ dernier numéro) est figé.
ALTER TABLE "DocumentCounter" ADD COLUMN "floor" INTEGER NOT NULL DEFAULT 0;
UPDATE "DocumentCounter" SET "floor" = "lastNumber";
