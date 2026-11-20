-- AlterTable
ALTER TABLE "User" ADD COLUMN "resetWindowStart" TIMESTAMP(3),
ADD COLUMN "resetWindowCount" INTEGER NOT NULL DEFAULT 0;
