// src/app/admin/discount-codes/new/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import DiscountCodeForm from "@/components/admin/discount-codes/discount-code-form";

export default async function NewDiscountCodePage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discount-codes/new");
  }

  const shopId = session.user.shopId;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get all products for the shop
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

  // Get all users for the shop (for user-specific codes)
  const users = await db.user.findMany({
    where: { shopId },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-800 mb-6">
        Create New Discount Code
      </h1>

      <DiscountCodeForm
        products={products}
        categories={categories}
        users={users}
        shopId={shopId}
        shopSettings={shopSettings}
      />
    </div>
  );
}
