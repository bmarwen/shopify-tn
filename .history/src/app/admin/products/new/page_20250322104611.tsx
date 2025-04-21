// src/app/admin/products/new/page.tsx
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import ProductForm from "@/components/admin/product-form";

interface FlatCategory {
  id: string;
  name: string;
  level: number;
}

interface CategoryWithChildren {
  id: string;
  name: string;
  children?: CategoryWithChildren[];
  parentId?: string | null;
}

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/products/new");
  }

  const shopId = session.user.shopId;

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

  // Get all custom fields for the shop
  const customFields = await db.customField.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });

  // Prepare a flat list of categories with indentation info for the form
  const flattenCategories = (
    categories: CategoryWithChildren[],
    level = 0
  ): FlatCategory[] => {
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
    categories.filter((c) => !c.parentId) as CategoryWithChildren[]
  );

  return (
    <div>
      <div className="text-2xl font-bold tracking-tight text-gray-800 mb-6">
        Add New Product
      </div>

      <ProductForm
        categories={flatCategories}
        customFields={customFields}
        shopId={shopId}
      />
    </div>
  );
}
