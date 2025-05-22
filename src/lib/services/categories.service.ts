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
      select: {
        id: true,
        name: true,
      },
    });
  },

  /**
   * Get a category by ID with product count
   */
  async getCategoryById(categoryId: string, shopId: string) {
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        shopId,
      },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });
    return category;
  },

  /**
   * Get the total product count for a category including all its subcategories
   */
  async getCategoryProductCount(categoryId: string, shopId: string) {
    // First, we need to get all subcategories (recursively)
    const getAllChildCategoryIds = async (
      parentId: string
    ): Promise<string[]> => {
      const childCategories = await db.category.findMany({
        where: { parentId, shopId },
        select: { id: true },
      });

      if (childCategories.length === 0) return [];

      const childIds = childCategories.map((c) => c.id);
      const grandChildIds = await Promise.all(
        childIds.map((id) => getAllChildCategoryIds(id))
      );

      return [...childIds, ...grandChildIds.flat()];
    };

    // Get all category IDs in the hierarchy
    const childCategoryIds = await getAllChildCategoryIds(categoryId);
    const allCategoryIds = [categoryId, ...childCategoryIds];

    // Count products in all those categories
    const totalProducts = await db.product.count({
      where: {
        categories: {
          some: {
            id: {
              in: allCategoryIds,
            },
          },
        },
        shopId,
      },
    });

    return totalProducts;
  },

  /**
   * Create a new category
   */
  async createCategory(data: any, shopId: string) {
    // Add shop ID to the data
    const categoryData = { ...data, shopId };

    // Check if slug already exists
    const existingCategory = await db.category.findFirst({
      where: {
        shopId,
        slug: data.slug,
      },
    });

    if (existingCategory) {
      throw new Error("A category with this slug already exists");
    }

    // Check if we're not exceeding nesting levels (max 3 levels)
    if (data.parentId) {
      const parentCategory = await db.category.findFirst({
        where: {
          id: data.parentId,
          shopId,
        },
        include: {
          parent: true,
        },
      });

      if (parentCategory?.parent?.parent) {
        throw new Error("Maximum category nesting level (3) exceeded");
      }
    }

    return await db.category.create({
      data: categoryData,
    });
  },

  /**
   * Update an existing category
   */
  async updateCategory(categoryId: string, shopId: string, data: any) {
    // Verify the category exists and belongs to this shop
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        shopId,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Check if slug already exists (except for this category)
    if (data.slug !== category.slug) {
      const existingCategory = await db.category.findFirst({
        where: {
          shopId,
          slug: data.slug,
          id: {
            not: categoryId,
          },
        },
      });

      if (existingCategory) {
        throw new Error("A category with this slug already exists");
      }
    }

    // Check for circular reference
    if (data.parentId && data.parentId !== category.parentId) {
      // Check if the new parent is not a child of this category
      const isCircular = await this.isCircularReference(
        shopId,
        categoryId,
        data.parentId
      );

      if (isCircular) {
        throw new Error(
          "Cannot set a subcategory as the parent (circular reference)"
        );
      }

      // Check nesting level
      const parentCategory = await db.category.findFirst({
        where: {
          id: data.parentId,
          shopId,
        },
        include: {
          parent: true,
        },
      });

      if (parentCategory?.parent?.parent) {
        throw new Error("Maximum category nesting level (3) exceeded");
      }
    }

    return await db.category.update({
      where: { id: categoryId },
      data,
    });
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string, shopId: string) {
    // Verify the category exists and belongs to this shop
    const category = await db.category.findFirst({
      where: {
        id: categoryId,
        shopId,
      },
      include: {
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Check if it has children
    if (category._count.children > 0) {
      throw new Error("Cannot delete a category that has subcategories");
    }

    // Check if it has products
    if (category._count.products > 0) {
      throw new Error("Cannot delete a category that has products");
    }

    // Delete the category
    return await db.category.delete({
      where: { id: categoryId },
    });
  },

  /**
   * Check if setting parentId would create a circular reference
   */
  async isCircularReference(
    shopId: string,
    categoryId: string,
    newParentId: string
  ): Promise<boolean> {
    let currentParentId = newParentId;

    // Navigate up the tree until we either find the category or reach a root
    while (currentParentId) {
      // If we find the category ID, it's a circular reference
      if (currentParentId === categoryId) {
        return true;
      }

      // Get the next parent up the tree
      const parent = await db.category.findFirst({
        where: {
          id: currentParentId,
          shopId,
        },
        select: { parentId: true },
      });

      // If we reached a root or the parent doesn't exist, stop
      if (!parent || !parent.parentId) {
        break;
      }

      // Move up the tree
      currentParentId = parent.parentId;
    }

    // If we got here, no circular reference was found
    return false;
  },

  /**
   * Get categories with full data including product counts
   */
  async getCategoriesWithCounts(shopId: string, withProductCount = false) {
    // Get all categories with basic counts
    const categories = await db.category.findMany({
      where: { shopId },
      include: {
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Add level information
    const withLevels = await this.addLevelsToCategories(categories);

    // If total product counts are requested, add them for each category
    if (withProductCount) {
      const withTotalCounts = await Promise.all(
        withLevels.map(async (category) => {
          const totalProducts = await this.getCategoryProductCount(
            category.id,
            shopId
          );
          return {
            ...category,
            totalProducts,
          };
        })
      );

      return withTotalCounts;
    }

    return withLevels;
  },

  /**
   * Add level information to all categories based on their hierarchy
   */
  async addLevelsToCategories(categories: any[]) {
    try {
      // Create a map for quick lookups
      const categoryMap = new Map();
      categories.forEach((category) => {
        categoryMap.set(category.id, category);
      });

      // Assign levels based on parent relationships
      const result = categories.map((category) => {
        let level = 0;
        let current = category;
        let parentId = current.parentId;

        // Navigate up the tree to determine level
        while (parentId) {
          level++;
          const parent = categoryMap.get(parentId);
          // Handle case where parent doesn't exist in our map
          if (!parent) break;
          parentId = parent.parentId;
        }

        return {
          ...category,
          level,
        };
      });

      // Sort hierarchically for display
      const sortedResult = [...result].sort((a, b) => {
        // First by level (root categories first)
        if (a.level !== b.level) return a.level - b.level;

        // Then by parent ID for same level categories
        if (a.parentId !== b.parentId) {
          if (a.parentId === null) return -1;
          if (b.parentId === null) return 1;
          return a.parentId.localeCompare(b.parentId);
        }

        // Finally by name for categories with the same parent
        return a.name.localeCompare(b.name);
      });

      return sortedResult;
    } catch (error) {
      console.error("Error adding levels to categories:", error);
      // Return the original array if something goes wrong
      return categories.map((category) => ({
        ...category,
        level: 0, // Default to level 0
      }));
    }
  },
};
