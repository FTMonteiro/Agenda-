-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "logoUrl" TEXT;

-- Até aqui a logo das Configurações ficava em imageUrl. Uma imageUrl que não é foto da
-- galeria é essa logo: passa para logoUrl, e imageUrl volta a ser a capa da galeria.
UPDATE "businesses" b
SET "logoUrl" = b."imageUrl"
WHERE b."imageUrl" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "gallery_images" g WHERE g."businessId" = b.id AND g.url = b."imageUrl");

UPDATE "businesses" b
SET "imageUrl" = (
  SELECT g.url FROM "gallery_images" g WHERE g."businessId" = b.id ORDER BY g.position, g."createdAt" LIMIT 1
)
WHERE b."logoUrl" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "gallery_images" g WHERE g."businessId" = b.id);
