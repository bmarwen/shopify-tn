/*
  Warnings:

  - You are about to drop the column `userId` on the `DiscountCode` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DiscountCode" DROP CONSTRAINT "DiscountCode_userId_fkey";

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DiscountCode" DROP COLUMN "userId",
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_DiscountCodeUsers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DiscountCodeUsers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DiscountCodeUsers_B_index" ON "_DiscountCodeUsers"("B");

-- AddForeignKey
ALTER TABLE "_DiscountCodeUsers" ADD CONSTRAINT "_DiscountCodeUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeUsers" ADD CONSTRAINT "_DiscountCodeUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
