-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- Backfill : date réelle de livraison = dernier passage au statut "Livré" dans le journal d'audit
UPDATE "Order" o SET "deliveredAt" = a.d
FROM (
  SELECT "orderId", MAX("createdAt") AS d FROM "AuditLog"
  WHERE "action" = 'Statut commande : Livré' AND "orderId" IS NOT NULL
  GROUP BY "orderId"
) a
WHERE o."id" = a."orderId" AND o."status" = 'LIVRE';

UPDATE "Quote" q SET "deliveredAt" = a.d
FROM (
  SELECT "quoteId", MAX("createdAt") AS d FROM "AuditLog"
  WHERE "action" = 'Statut devis : Livré' AND "quoteId" IS NOT NULL
  GROUP BY "quoteId"
) a
WHERE q."id" = a."quoteId" AND q."status" = 'LIVRE';

-- Sans trace dans l'audit (ventes importées, anciennes données) : on garde la date
-- de création, qui était déjà la date utilisée jusqu'ici par le dashboard.
UPDATE "Order" SET "deliveredAt" = "createdAt" WHERE "status" = 'LIVRE' AND "deliveredAt" IS NULL;
UPDATE "Quote" SET "deliveredAt" = "createdAt" WHERE "status" = 'LIVRE' AND "deliveredAt" IS NULL;
