// src/app/admin/discounts/new/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import DiscountForm from "@/components/admin/discount-form";

export default async function NewDiscountPage() {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discounts/new");
  }

  const shopId = session.user.shopId;

  // Get all products for the shop (for the product dropdown)
  const products = await db.product.findMany({
    where: { shopId },
    select: {
      id: true,
      name: true,
      price: true,
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

      <DiscountForm products={products} shopId={shopId} />
    </div>
  );
}
