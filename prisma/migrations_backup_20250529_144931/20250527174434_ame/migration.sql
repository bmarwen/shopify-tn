/*
  Warnings:

  - The values [CREDIT_CARD] on the enum `PaymentMethodType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('RECEIVED', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethodType_new" AS ENUM ('CASH', 'BANK_TRANSFER', 'REMITLY', 'CARD', 'PAYPAL', 'CHECK', 'OTHER');
ALTER TABLE "Order" ALTER COLUMN "paymentMethodType" DROP DEFAULT;
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" DROP DEFAULT;
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" TYPE "PaymentMethodType_new" USING ("paymentMethod"::text::"PaymentMethodType_new");
ALTER TABLE "Order" ALTER COLUMN "paymentMethodType" TYPE "PaymentMethodType_new" USING ("paymentMethodType"::text::"PaymentMethodType_new");
ALTER TYPE "PaymentMethodType" RENAME TO "PaymentMethodType_old";
ALTER TYPE "PaymentMethodType_new" RENAME TO "PaymentMethodType";
DROP TYPE "PaymentMethodType_old";
ALTER TABLE "Order" ALTER COLUMN "paymentMethodType" SET DEFAULT 'CASH';
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashAmountChange" DOUBLE PRECISION,
ADD COLUMN     "cashAmountGiven" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CheckPayment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "bankName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "checkDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "depositDate" TIMESTAMP(3),
    "clearanceDate" TIMESTAMP(3),
    "status" "CheckStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CheckPayment" ADD CONSTRAINT "CheckPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckPayment" ADD CONSTRAINT "CheckPayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
