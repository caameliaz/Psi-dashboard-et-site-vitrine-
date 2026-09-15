-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "assignedToId" TEXT;

-- CreateTable
CREATE TABLE "LeaveAssignment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "clientIds" TEXT[],
    "allowFullHistory" BOOLEAN NOT NULL DEFAULT false,
    "status" "LeaveStatus" NOT NULL DEFAULT 'ACTIVE',
    "endedAt" TIMESTAMP(3),
    "endedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveAssignment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveAssignment" ADD CONSTRAINT "LeaveAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveAssignment" ADD CONSTRAINT "LeaveAssignment_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
