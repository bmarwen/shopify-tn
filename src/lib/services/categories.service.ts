// src/lib/services/categories.service.ts
import { db } from "@/lib/prisma";

export const categoriesService = {
  /**
   * Get all categories for a shop with hierarchy information
   */
  async getCategoriesWithHierarchy(shopId: string) {
    // Get all categories for the shop
    const allCategories = await db.category.findMany({
      where: { shopId },
      select: {
        id: true,
        name: true,
        parentId: true,
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

    return createFlatCategoriesWithLevels(allCategories);
  },

  /**
   * Get simple list of categories for a shop (for filtering)
   */
  async getCategories(shopId: string) {
    return await db.category.findMany({
      where: { shopId },
      select: { id: true, name: true },
    });
  },
};
