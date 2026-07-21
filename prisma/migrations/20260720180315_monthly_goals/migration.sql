-- CreateTable
CREATE TABLE "MonthlyGoal" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyGoal_month_userId_key" ON "MonthlyGoal"("month", "userId");
