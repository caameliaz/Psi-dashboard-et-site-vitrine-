-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recapDaily" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recapWeekly" BOOLEAN NOT NULL DEFAULT true;
