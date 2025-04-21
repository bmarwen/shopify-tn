// src/lib/services/products.service.ts
import { db } from "@/lib/prisma";

export interface ProductsFilter {
  shopId: string;
  search?: string;
  categoryId?: string;
  inStock?: boolean;
  lowStock?: boolean;
  expiringSoon?: boolean;
  lowStockThreshold?: number;
}

export interface ProductsSortOptions {
  sortField: string;
  sortOrder: "asc" | "desc";
}

export interface ProductsPagination {
  page: number;
  perPage: number;
}

export const productsService = {
  /**
   * Get total products count based on filters
   */
  async getTotalProducts(filters: ProductsFilter): Promise<number> {
    const where: any = { shopId: filters.shopId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
        { barcode: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.categoryId) {
      where.categories = {
        some: { id: filters.categoryId },
      };
    }

    if (filters.inStock) {
      where.inventory = { gt: 0 };
    }

    if (filters.lowStock) {
      where.inventory = { lte: filters.lowStockThreshold || 5 };
    }

    if (filters.expiringSoon) {
      // Products expiring in the next 30 days
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);

      where.expiryDate = {
        gte: today,
        lte: thirtyDaysLater,
      };
    }

    return await db.product.count({ where });
  },

  /**
   * Get products with pagination, filtering and sorting
   */
  async getProducts(
    filters: ProductsFilter,
    pagination: ProductsPagination,
    sort: ProductsSortOptions
  ) {
    const where: any = { shopId: filters.shopId };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { sku: { contains: filters.search, mode: "insensitive" } },
        { barcode: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.categoryId) {
      where.categories = {
        some: { id: filters.categoryId },
      };
    }

    if (filters.inStock) {
      where.inventory = { gt: 0 };
    }

    if (filters.lowStock) {
      where.inventory = { lte: filters.lowStockThreshold || 5 };
    }

    if (filters.expiringSoon) {
      // Products expiring in the next 30 days
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);

      where.expiryDate = {
        gte: today,
        lte: thirtyDaysLater,
      };
    }

    return await db.product.findMany({
      where,
      include: {
        categories: {
          select: { id: true, name: true, slug: true },
        },
        variants: true,
        customFields: {
          include: {
            customField: true,
          },
        },
        _count: {
          select: {
            variants: true,
            orderItems: true,
          },
        },
        discounts: {
          where: {
            enabled: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
          select: {
            id: true,
            percentage: true,
          },
          take: 1, // Just get the first active discount
        },
      },
      orderBy: { [sort.sortField]: sort.sortOrder },
      skip: (pagination.page - 1) * pagination.perPage,
      take: pagination.perPage,
    });
  },

  /**
   * Get categories for a shop
   */
  async getCategories(shopId: string) {
    return await db.category.findMany({
      where: { shopId },
      select: { id: true, name: true },
    });
  },

  /**
   * Get shop settings including low stock threshold
   */
  async getShopSettings(shopId: string) {
    return await db.shopSettings.findUnique({
      where: { shopId },
      select: { lowStockThreshold: true },
    });
  },

  /**
   * Get product statistics
   */
  async getProductStats(shopId: string, lowStockThreshold: number) {
    try {
      // Use a safer approach that doesn't return BigInt directly
      const products = await db.product.findMany({
        where: { shopId },
        select: { inventory: true },
      });

      // Calculate statistics manually
      let totalInventory = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      products.forEach((product) => {
        totalInventory += product.inventory;
        if (product.inventory <= lowStockThreshold) lowStockCount++;
        if (product.inventory === 0) outOfStockCount++;
      });

      return {
        totalInventory,
        lowStockCount,
        outOfStockCount,
      };
    } catch (error) {
      console.error("Error getting product stats:", error);
      // Return safe default values
      return {
        totalInventory: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
      };
    }
  },
};
