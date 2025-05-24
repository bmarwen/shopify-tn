/*
  Warnings:

  - The values [PROCESSING] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `shippingStatus` on the `Order` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'IN_STORE', 'PHONE');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'RETURNED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shippingStatus",
ADD COLUMN     "orderSource" "OrderSource" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN     "paymentMethodType" "PaymentMethodType" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "processedByUserId" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionPayment" ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH';

-- DropEnum
DROP TYPE "ShippingStatus";

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
