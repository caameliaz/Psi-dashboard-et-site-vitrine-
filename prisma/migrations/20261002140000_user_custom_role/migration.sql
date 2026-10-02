-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customRoleId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Comptes déjà créés avec un rôle perso : on leur rattache le rôle dont les autorisations sont EXACTEMENT les leurs
-- (même ensemble, ordre indifférent). Employés uniquement ; sans correspondance, la colonne reste NULL.
UPDATE "User" u
SET "customRoleId" = (
  SELECT cr."id" FROM "CustomRole" cr
  WHERE cr."permissions" @> u."permissions" AND cr."permissions" <@ u."permissions"
  ORDER BY cr."createdAt" ASC
  LIMIT 1
)
WHERE u."role" = 'EMPLOYEE' AND cardinality(u."permissions") > 0;
