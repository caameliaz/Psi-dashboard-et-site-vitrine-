-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "assignedSince" TIMESTAMP(3);

-- Clients déjà assignés : NULL = leur commercial actuel garde tout l'historique (rien ne change pour eux).
