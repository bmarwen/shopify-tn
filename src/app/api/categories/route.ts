// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serializer";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const flat = searchParams.get("flat") === "true";

    // Build where clause
    const where: any = { shopId };

    // Filter by parent category if specified
    if (parentId) {
      where.parentId = parentId;
    }

    // Query categories
    let categories;

    if (flat) {
      // Get all categories for the shop without hierarchy
      categories = await db.category.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: {
          name: "asc",
        },
      });
    } else {
      // Get all categories with hierarchy information
      const allCategories = await db.category.findMany({
        where: { shopId },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      // Function to add level information to categories
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
            slug: category.slug,
            level,
            parentId: category.parentId,
          }));
      };

      // Function to create flat array with correct level
      const createFlatCategoriesWithLevels = (categories: any[]) => {
        // First get all root categories (those with no parent)
        let result = addLevelToCategories(categories);

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

      categories = createFlatCategoriesWithLevels(allCategories);
    }

    // Handle the case where no categories exist
    if (!categories) {
      categories = [];
    }

    // Serialize any BigInt values that might be in the response
    return NextResponse.json(serializeBigInt(categories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
