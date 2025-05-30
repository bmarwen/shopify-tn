// src/app/admin/discount-codes/[id]/edit/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import DiscountCodeForm from "@/components/admin/discount-codes/discount-code-form";

interface EditDiscountCodePageProps {
  params: {
    id: string;
  };
}

export default async function EditDiscountCodePage({
  params,
}: EditDiscountCodePageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discount-codes");
  }

  const shopId = session.user.shopId;
  const discountCodeId = params.id;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get the discount code with all related data
  const discountCode = await db.discountCode.findFirst({
    where: {
      id: discountCodeId,
      shopId,
    },
    include: {
      products: {
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
      },
      variants: {
        select: {
          id: true,
          name: true,
          price: true,
          sku: true,
          barcode: true,
          inventory: true,
          options: true,
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!discountCode) {
    notFound();
  }

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

  // Get all users for the shop
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
        Edit Discount Code: {discountCode.code}
      </h1>

      <DiscountCodeForm
        discountCode={discountCode}
        products={products}
        categories={categories}
        users={users}
        shopId={shopId}
        shopSettings={shopSettings}
        isEditing
      />
    </div>
  );
}
