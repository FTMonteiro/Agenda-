-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_clientId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_userId_fkey";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "walkInClientId" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "walkInClientId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "walk_in_clients" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "walk_in_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "walk_in_clients_businessId_idx" ON "walk_in_clients"("businessId");

-- CreateIndex
CREATE INDEX "appointments_walkInClientId_idx" ON "appointments"("walkInClientId");

-- AddForeignKey
ALTER TABLE "walk_in_clients" ADD CONSTRAINT "walk_in_clients_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_walkInClientId_fkey" FOREIGN KEY ("walkInClientId") REFERENCES "walk_in_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_walkInClientId_fkey" FOREIGN KEY ("walkInClientId") REFERENCES "walk_in_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
