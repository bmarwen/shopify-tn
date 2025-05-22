// src/lib/services/products.service.ts (Updated with getProductById)
import { db } from "@/lib/prisma";
import { s3ImageService } from "@/lib/services/s3-image.service";

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

    const products = await db.product.findMany({
      where,
      include: {
        categories: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
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
      orderBy: {
        [sort.sortField]: sort.sortOrder,
      },
      skip: (pagination.page - 1) * pagination.perPage,
      take: pagination.perPage,
    });

    // Process images - convert S3 keys to URLs
    const productsWithImageUrls = await Promise.all(
      products.map(async (product) => {
        if (product.images && product.images.length > 0) {
          const processedImages = await Promise.all(
            product.images.map(async (image) => {
              if (s3ImageService.isS3Key(image)) {
                try {
                  return await s3ImageService.getImageUrl(image);
                } catch (error) {
                  console.error(`Error getting image URL for ${image}:`, error);
                  return image; // Return original key if URL generation fails
                }
              }
              return image; // Return original URL if not an S3 key
            })
          );

          return {
            ...product,
            images: processedImages,
            s3Keys: product.images, // Store original keys for reference
          };
        }
        return product;
      })
    );

    return productsWithImageUrls;
  },

  /**
   * Get categories for a shop
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

  /**
   * Get a product by ID with validation that it belongs to a shop
   */
  async getProductById(productId: string, shopId: string) {
    const product = await db.product.findUnique({
      where: {
        id: productId,
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
      return null;
    }

    // Process S3 image URLs
    let productWithUrls = { ...product };
    if (product.images && product.images.length > 0) {
      try {
        const processedImages = await Promise.all(
          product.images.map(async (image) => {
            if (s3ImageService.isS3Key(image)) {
              try {
                return await s3ImageService.getImageUrl(image);
              } catch (error) {
                console.error(`Error getting image URL for ${image}:`, error);
                return image; // Return original key if URL generation fails
              }
            }
            return image; // Return original URL if not an S3 key
          })
        );

        productWithUrls = {
          ...product,
          images: processedImages,
          s3Keys: product.images, // Store original keys for reference
        };
      } catch (error) {
        console.error("Error processing product images:", error);
        // Continue with original product if image processing fails
      }
    }

    return productWithUrls;
  },

  /**
   * Process images for a product - handles S3 uploads and URL generation
   */
  async processProductImages(
    images: string[],
    productSlug: string
  ): Promise<string[]> {
    const processedImages = [];

    if (images && images.length > 0) {
      for (const image of images) {
        if (image.startsWith("data:")) {
          try {
            // Upload base64 image to S3
            const fileName = `${productSlug}-${Date.now()}`;
            const uploadResult = await s3ImageService.uploadImage(
              image,
              `${fileName}.jpg`,
              "products"
            );
            processedImages.push(uploadResult.key);
          } catch (error) {
            console.error("Error uploading image to S3:", error);
            // Skip this image if upload fails
          }
        } else {
          // Keep existing image URLs or S3 keys
          processedImages.push(image);
        }
      }
    }

    return processedImages;
  },

  /**
   * Delete product images from S3
   */
  async deleteProductImages(images: string[]): Promise<void> {
    if (!images || images.length === 0) return;

    const s3Images = images.filter((image) => s3ImageService.isS3Key(image));

    for (const imageKey of s3Images) {
      try {
        await s3ImageService.deleteImage(imageKey);
        console.log(`Deleted product image from S3: ${imageKey}`);
      } catch (error) {
        console.error(
          `Error deleting product image ${imageKey} from S3:`,
          error
        );
        // Continue with next image even if deletion fails
      }
    }
  },

  /**
   * Generate S3 image URLs for product images
   */
  async getProductImageUrls(images: string[]): Promise<string[]> {
    if (!images || images.length === 0) return [];

    const processedImages = await Promise.all(
      images.map(async (image) => {
        if (s3ImageService.isS3Key(image)) {
          try {
            return await s3ImageService.getImageUrl(image);
          } catch (error) {
            console.error(`Error getting image URL for ${image}:`, error);
            return image; // Return original key if URL generation fails
          }
        }
        return image; // Return original URL if not an S3 key
      })
    );

    return processedImages;
  },
};
