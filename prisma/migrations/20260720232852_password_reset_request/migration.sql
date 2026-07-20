-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetRequestedAt" TIMESTAMP(3);
