// src/app/admin/discounts/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import DiscountForm from "@/components/admin/discount-form";

interface EditDiscountPageProps {
  params: {
    id: string;
  };
}

export default async function EditDiscountPage({
  params,
}: EditDiscountPageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discounts");
  }

  const shopId = session.user.shopId;
  const discountId = params.id;

  // Get the discount (with validation that it belongs to this shop)
  const discount = await db.discount.findFirst({
    where: {
      id: discountId,
      product: {
        shopId,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });

  if (!discount) {
    notFound();
  }

  // Get all products for the shop
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
        Edit Discount for {discount.product.name}
      </h1>

      <DiscountForm
        discount={discount}
        products={products}
        shopId={shopId}
        isEditing
      />
    </div>
  );
}
