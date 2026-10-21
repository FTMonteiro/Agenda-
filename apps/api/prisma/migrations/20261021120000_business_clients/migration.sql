-- CreateTable
CREATE TABLE "business_clients" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_clients_businessId_userId_key" ON "business_clients"("businessId", "userId");

-- CreateIndex
CREATE INDEX "business_clients_userId_idx" ON "business_clients"("userId");

-- AddForeignKey
ALTER TABLE "business_clients" ADD CONSTRAINT "business_clients_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_clients" ADD CONSTRAINT "business_clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: until now every app user who booked was listed as a client of that business.
-- They keep that place, so no business loses clients it already had.
INSERT INTO "business_clients" ("id", "businessId", "userId", "createdAt")
SELECT gen_random_uuid()::text, a."businessId", a."clientId", MIN(a."createdAt")
FROM "appointments" a
WHERE a."clientId" IS NOT NULL
GROUP BY a."businessId", a."clientId"
ON CONFLICT ("businessId", "userId") DO NOTHING;
