-- AlterTable
ALTER TABLE "User" ADD COLUMN     "canHardDelete" BOOLEAN NOT NULL DEFAULT false;

-- Seule Camélia peut supprimer définitivement un compte (les autres admins peuvent seulement désactiver)
UPDATE "User" SET "canHardDelete" = true WHERE LOWER("email") = 'cameliamerniz@gmail.com';
