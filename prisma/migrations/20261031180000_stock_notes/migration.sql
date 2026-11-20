-- CreateTable
CREATE TABLE "StockNote" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockNote_kind_refKey_idx" ON "StockNote"("kind", "refKey");

-- AddForeignKey
ALTER TABLE "StockNote" ADD CONSTRAINT "StockNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
