-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "provincia" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "bairro" TEXT;

-- CreateIndex
CREATE INDEX "businesses_provincia_bairro_idx" ON "businesses"("provincia", "bairro");

-- Backfill: until now the region lived at the end of the address text, written as
-- "Rua, Bairro, Província". Copy what the owner already entered into the new columns so
-- existing businesses stay findable by locality; nothing is invented, and an address
-- with a single part is left alone (it's just a street).
UPDATE "businesses" AS b
SET "provincia" = parts.items[array_length(parts.items, 1)],
    "bairro" = CASE WHEN array_length(parts.items, 1) >= 3 THEN parts.items[array_length(parts.items, 1) - 1] END
FROM (
  SELECT "id", regexp_split_to_array(btrim("address"), '\s*,\s*') AS items
  FROM "businesses"
  WHERE "address" IS NOT NULL AND btrim("address") <> ''
) AS parts
WHERE b."id" = parts."id" AND array_length(parts.items, 1) >= 2;
