-- AlterTable
ALTER TABLE "users" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3);
