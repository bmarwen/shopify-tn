// src/app/admin/discounts/new/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import EnhancedDiscountForm from "@/components/admin/enhanced-discount-form";

export default async function NewDiscountPage() {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discounts/new");
  }

  const shopId = session.user.shopId;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get all products for the shop with complete variant data
  const products = await db.product.findMany({
    where: { shopId },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      variants: {
        select: {
          id: true,
          name: true,
          price: true,
          sku: true,
          barcode: true,
          inventory: true,
          options: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Get all categories for the shop
  const categories = await db.category.findMany({
    where: { shopId },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-800 mb-6">
        Create New Discount
      </h1>

      <EnhancedDiscountForm 
        products={products}
        categories={categories}
        shopId={shopId} 
        shopSettings={shopSettings}
      />
    </div>
  );
}
