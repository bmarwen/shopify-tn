-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "options" JSONB;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "cost" DOUBLE PRECISION,
ADD COLUMN     "tva" DOUBLE PRECISION NOT NULL DEFAULT 19;
