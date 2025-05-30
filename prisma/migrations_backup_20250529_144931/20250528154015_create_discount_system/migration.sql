/*
  Warnings:

  - The values [CARD] on the enum `PaymentMethodType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `productId` on the `DiscountCode` table. All the data in the column will be lost.
  - You are about to drop the column `orderPayments` on the `Order` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethodType_new" AS ENUM ('CASH', 'BANK_TRANSFER', 'REMITLY', 'CREDIT_CARD', 'PAYPAL', 'CHECK', 'OTHER');
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" TYPE "PaymentMethodType_new" USING ("paymentMethod"::text::"PaymentMethodType_new");
ALTER TABLE "Order" ALTER COLUMN "paymentMethodType" TYPE "PaymentMethodType_new" USING ("paymentMethodType"::text::"PaymentMethodType_new");
ALTER TABLE "OrderPayment" ALTER COLUMN "paymentMethod" TYPE "PaymentMethodType_new" USING ("paymentMethod"::text::"PaymentMethodType_new");
ALTER TYPE "PaymentMethodType" RENAME TO "PaymentMethodType_old";
ALTER TYPE "PaymentMethodType_new" RENAME TO "PaymentMethodType";
DROP TYPE "PaymentMethodType_old";
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH';
COMMIT;

-- DropForeignKey
ALTER TABLE "DiscountCode" DROP CONSTRAINT "DiscountCode_productId_fkey";

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "availableInStore" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableOnline" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "DiscountCode" DROP COLUMN "productId",
ADD COLUMN     "availableInStore" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "availableOnline" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "categoryId" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "orderPayments",
ALTER COLUMN "paymentMethodType" SET DEFAULT 'CASH';

-- CreateTable
CREATE TABLE "SystemLimit" (
    "id" TEXT NOT NULL,
    "codeName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "planType" "PlanType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DiscountCodeProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DiscountCodeProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemLimit_codeName_key" ON "SystemLimit"("codeName");

-- CreateIndex
CREATE INDEX "_DiscountCodeProducts_B_index" ON "_DiscountCodeProducts"("B");

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeProducts" ADD CONSTRAINT "_DiscountCodeProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeProducts" ADD CONSTRAINT "_DiscountCodeProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
