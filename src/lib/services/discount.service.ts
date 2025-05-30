import { db } from "@/lib/prisma";

export interface DiscountCodeValidation {
  valid: boolean;
  discountCode?: any;
  message?: string;
  discountPercentage?: number;
  applicableProducts?: string[];
  applicableVariants?: string[]; // Add variant support
}

export const discountService = {
  /**
   * Validate and get discount code for POS/in-store use
   */
  async validateDiscountCodeForStore(
    code: string,
    shopId: string,
    productIds: string[] = [],
    variantIds: string[] = [] // Add variant IDs support
  ): Promise<DiscountCodeValidation> {
    const discountCode = await db.discountCode.findFirst({
      where: {
        code: code.toUpperCase(),
        shopId,
        isActive: true,
        availableInStore: true, // Must be available for in-store use
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        products: {
          select: { id: true, name: true },
        },
        variants: {
          select: { 
            id: true, 
            name: true,
            product: {
              select: { id: true, name: true }
            }
          },
        },
        category: {
          include: {
            products: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!discountCode) {
      return {
        valid: false,
        message: "Invalid or expired discount code",
      };
    }

    // Determine applicable products and variants
    let applicableProducts: string[] = [];
    let applicableVariants: string[] = [];

    if (discountCode.variants.length > 0) {
      // Code applies to specific variants
      applicableVariants = discountCode.variants.map(v => v.id);
      // Also include the parent products of these variants
      applicableProducts = [...new Set(discountCode.variants.map(v => v.product.id))];
    } else if (discountCode.products.length > 0) {
      // Code applies to entire products (all variants)
      applicableProducts = discountCode.products.map(p => p.id);
    } else if (discountCode.category) {
      // Code applies to category products
      applicableProducts = discountCode.category.products.map(p => p.id);
    } else {
      // Code applies to all products and variants
      applicableProducts = productIds;
      applicableVariants = variantIds;
    }

    // Check if any of the cart items qualify for this discount
    let qualifyingProducts: string[] = [];
    let qualifyingVariants: string[] = [];

    if (applicableVariants.length > 0) {
      // Variant-specific discount
      qualifyingVariants = variantIds.filter(id => applicableVariants.includes(id));
      if (qualifyingVariants.length === 0) {
        return {
          valid: false,
          message: "This discount code doesn't apply to any selected variants in your cart",
        };
      }
    } else {
      // Product-level discount
      qualifyingProducts = productIds.filter(id => 
        applicableProducts.length === 0 || applicableProducts.includes(id)
      );
      if (qualifyingProducts.length === 0 && applicableProducts.length > 0) {
        return {
          valid: false,
          message: "This discount code doesn't apply to any items in your cart",
        };
      }
    }

    return {
      valid: true,
      discountCode,
      discountPercentage: discountCode.percentage,
      applicableProducts: qualifyingProducts,
      applicableVariants: qualifyingVariants,
    };
  },

  /**
   * Validate and get discount code for online use
   */
  async validateDiscountCodeForOnline(
    code: string,
    shopId: string,
    productIds: string[] = []
  ): Promise<DiscountCodeValidation> {
    const discountCode = await db.discountCode.findFirst({
      where: {
        code: code.toUpperCase(),
        shopId,
        isActive: true,
        availableOnline: true, // Must be available for online use
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        products: {
          select: { id: true, name: true },
        },
        category: {
          include: {
            products: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!discountCode) {
      return {
        valid: false,
        message: "Invalid or expired discount code",
      };
    }

    // Same logic as store validation but for online
    let applicableProducts: string[] = [];

    if (discountCode.products.length > 0) {
      applicableProducts = discountCode.products.map(p => p.id);
    } else if (discountCode.category) {
      applicableProducts = discountCode.category.products.map(p => p.id);
    } else {
      applicableProducts = productIds;
    }

    const qualifyingProducts = productIds.filter(id => 
      applicableProducts.length === 0 || applicableProducts.includes(id)
    );

    if (qualifyingProducts.length === 0 && applicableProducts.length > 0) {
      return {
        valid: false,
        message: "This discount code doesn't apply to any items in your cart",
      };
    }

    return {
      valid: true,
      discountCode,
      discountPercentage: discountCode.percentage,
      applicableProducts: qualifyingProducts,
    };
  },

  /**
   * Search products for discount code targeting
   */
  async searchProducts(shopId: string, query: string) {
    if (query.length < 3) return [];

    return await db.product.findMany({
      where: {
        shopId,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
      },
      take: 20,
    });
  },

  /**
   * Search categories for discount code targeting
   */
  async searchCategories(shopId: string, query: string) {
    if (query.length < 3) return [];

    return await db.category.findMany({
      where: {
        shopId,
        name: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: true },
        },
      },
      take: 10,
    });
  },
};
