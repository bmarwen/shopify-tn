// src/app/admin/products/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import ProductForm from "@/components/admin/product-form";

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/products");
  }

  const shopId = session.user.shopId;

  // Get the product
  const product = await db.product.findUnique({
    where: {
      id: params.id,
      shopId, // Ensure it belongs to this shop
    },
    include: {
      categories: true,
      variants: true,
      customFields: {
        include: {
          customField: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Get all categories for the shop
  const categories = await db.category.findMany({
    where: { shopId },
    include: {
      children: {
        include: {
          children: true,
        },
      },
    },
  });

  // Prepare a flat list of categories with indentation info for the form
  const flattenCategories = (categories: any[], level = 0) => {
    return categories.flatMap((category) => [
      {
        id: category.id,
        name: category.name,
        level,
      },
      ...flattenCategories(category.children || [], level + 1),
    ]);
  };

  const flatCategories = flattenCategories(
    categories.filter((c) => !c.parentId)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Edit Product: {product.name}
      </h1>

      <ProductForm
        product={product}
        categories={flatCategories}
        shopId={shopId}
        isEditing
      />
    </div>
  );
}
