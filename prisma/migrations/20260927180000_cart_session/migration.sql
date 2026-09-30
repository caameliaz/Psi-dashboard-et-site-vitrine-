-- CreateEnum
CREATE TYPE "CartSessionStatus" AS ENUM ('EN_COURS', 'ABANDONNE', 'CONVERTI');

-- CreateTable
CREATE TABLE "CartSession" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "status" "CartSessionStatus" NOT NULL DEFAULT 'EN_COURS',
    "itemsCount" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "convertedAt" TIMESTAMP(3),

    CONSTRAINT "CartSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CartSession_anonId_key" ON "CartSession"("anonId");

-- CreateIndex
CREATE INDEX "CartSession_status_updatedAt_idx" ON "CartSession"("status", "updatedAt");
