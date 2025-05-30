/*
  Warnings:

  - You are about to drop the column `options` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `CustomFieldValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CustomFieldValue" DROP CONSTRAINT "CustomFieldValue_customFieldId_fkey";

-- DropForeignKey
ALTER TABLE "CustomFieldValue" DROP CONSTRAINT "CustomFieldValue_productId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "options";

-- AlterTable
ALTER TABLE "ShopSettings" ALTER COLUMN "currency" SET DEFAULT 'DT';

-- DropTable
DROP TABLE "CustomFieldValue";

-- CreateTable
CREATE TABLE "VariantCustomFieldValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantCustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariantCustomFieldValue_customFieldId_variantId_key" ON "VariantCustomFieldValue"("customFieldId", "variantId");

-- AddForeignKey
ALTER TABLE "VariantCustomFieldValue" ADD CONSTRAINT "VariantCustomFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantCustomFieldValue" ADD CONSTRAINT "VariantCustomFieldValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
