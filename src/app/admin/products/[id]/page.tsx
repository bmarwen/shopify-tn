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

  // Get all categories for the shop with hierarchy information
  const allCategories = await db.category.findMany({
    where: { shopId },
    select: {
      id: true,
      name: true,
      parentId: true,
    },
  });

  // Map categories with level information
  // This recursive function determines the depth level of each category
  const addLevelToCategories = (
    categories: any[],
    parentId: string | null = null,
    level = 0
  ) => {
    return categories
      .filter((category) => category.parentId === parentId)
      .map((category) => ({
        id: category.id,
        name: category.name,
        level,
        parentId: category.parentId,
      }));
  };

  // Function to create flat array with correct level
  const createFlatCategoriesWithLevels = (categories: any[]) => {
    // First get all root categories (those with no parent)
    const result = addLevelToCategories(categories);

    // For each root category, recursively add its children
    for (let i = 0; i < result.length; i++) {
      const category = result[i];
      const children = addLevelToCategories(
        categories,
        category.id,
        category.level + 1
      );

      // Insert children after their parent
      if (children.length > 0) {
        result.splice(i + 1, 0, ...children);
        // Skip the children we just added
        i += children.length;
      }
    }

    return result;
  };

  const flatCategories = createFlatCategoriesWithLevels(allCategories);

  // Get all custom fields for the shop
  const customFields = await db.customField.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="text-2xl font-bold tracking-tight text-gray-800 mb-6">
        Edit Product: {product.name}
      </div>

      <ProductForm
        product={product}
        categories={flatCategories}
        customFields={customFields}
        shopId={shopId}
        isEditing
      />
    </div>
  );
}
