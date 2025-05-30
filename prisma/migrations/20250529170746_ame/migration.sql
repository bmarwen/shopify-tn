-- CreateTable
CREATE TABLE "_DiscountCodeVariants" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DiscountCodeVariants_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DiscountCodeVariants_B_index" ON "_DiscountCodeVariants"("B");

-- AddForeignKey
ALTER TABLE "_DiscountCodeVariants" ADD CONSTRAINT "_DiscountCodeVariants_A_fkey" FOREIGN KEY ("A") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DiscountCodeVariants" ADD CONSTRAINT "_DiscountCodeVariants_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
