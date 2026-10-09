-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "category" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "professionals" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "specialty" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "category" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);
