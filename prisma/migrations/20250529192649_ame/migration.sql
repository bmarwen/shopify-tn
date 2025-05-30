-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "_DiscountProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DiscountProducts_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DiscountVariants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DiscountVariants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DiscountProducts_B_index" ON "_DiscountProducts"("B");

-- CreateIndex
CREATE INDEX "_DiscountVariants_B_index" ON "_DiscountVariants"("B");

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountProducts" ADD CONSTRAINT "_DiscountProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountProducts" ADD CONSTRAINT "_DiscountProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountVariants" ADD CONSTRAINT "_DiscountVariants_A_fkey" FOREIGN KEY ("A") REFERENCES "Discount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountVariants" ADD CONSTRAINT "_DiscountVariants_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
