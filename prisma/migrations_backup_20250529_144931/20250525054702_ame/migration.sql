/*
  Warnings:

  - You are about to drop the column `cost` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `inventory` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `lowStockAlert` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `tva` on the `Product` table. All the data in the column will be lost.
  - Made the column `price` on table `ProductVariant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "cost",
DROP COLUMN "inventory",
DROP COLUMN "lowStockAlert",
DROP COLUMN "price",
DROP COLUMN "tva";

-- AlterTable
ALTER TABLE "ProductVariant" ALTER COLUMN "price" SET NOT NULL;
