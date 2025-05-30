// src/app/admin/discounts/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import EnhancedDiscountForm from "@/components/admin/enhanced-discount-form";

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

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get the discount with enhanced relations (using API endpoint logic)
  const discount = await db.discount.findFirst({
    where: {
      id: discountId,
      OR: [
        // Legacy single product/variant discounts
        {
          product: { shopId },
        },
        {
          variant: {
            product: { shopId }
          }
        },
        // Multi-targeting discounts (products)
        {
          products: {
            some: {
              shopId: shopId
            }
          }
        },
        // Multi-targeting discounts (variants)
        {
          variants: {
            some: {
              product: {
                shopId: shopId
              }
            }
          }
        },
        // Category targeting
        {
          category: {
            shopId: shopId
          }
        },
      ]
    },
    include: {
      // Legacy relations
      product: {
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
            }
          }
        },
      },
      variant: {
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
              name: true
            }
          }
        }
      },
      // Multi-targeting relations
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
            }
          }
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
            select: { id: true, name: true }
          }
        },
      },
      category: {
        select: { id: true, name: true },
      },
    },
  });

  if (!discount) {
    notFound();
  }

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

  // Determine discount title for page header
  const getDiscountTitle = () => {
    if (discount.title) {
      return discount.title;
    }
    if (discount.product) {
      return discount.product.name;
    }
    if (discount.variant) {
      return `${discount.variant.product.name} - ${discount.variant.name}`;
    }
    if (discount.category) {
      return `${discount.category.name} Category`;
    }
    if (discount.products && discount.products.length > 0) {
      return `${discount.products.length} Products`;
    }
    if (discount.variants && discount.variants.length > 0) {
      return `${discount.variants.length} Variants`;
    }
    return "All Products";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-800 mb-6">
        Edit Discount: {getDiscountTitle()}
      </h1>

      <EnhancedDiscountForm
        discount={discount}
        products={products}
        categories={categories}
        shopId={shopId}
        shopSettings={shopSettings}
        isEditing
      />
    </div>
  );
}
