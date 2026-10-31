-- CreateTable
CREATE TABLE "StockAlertState" (
    "kind" TEXT NOT NULL,
    "refKey" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlertState_pkey" PRIMARY KEY ("kind","refKey")
);
