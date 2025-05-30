// src/lib/services/discount-validation.service.ts
import { db } from "@/lib/prisma";

export interface DiscountValidationResult {
  valid: boolean;
  error?: string;
  discountCode?: {
    id: string;
    code: string;
    percentage: number;
    title?: string;
    description?: string;
  };
  discountAmount?: number;
  orderTotal?: number;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    categories: { id: string }[];
  };
}

export interface ValidateDiscountCodeParams {
  code: string;
  shopId: string;
  orderSource: 'ONLINE' | 'IN_STORE';
  customerId?: string;
  cartItems: CartItem[];
  subtotal: number;
}

export class DiscountValidationService {
  /**
   * Validate a discount code and calculate discount amount
   */
  static async validateDiscountCode({
    code,
    shopId,
    orderSource,
    customerId,
    cartItems,
    subtotal,
  }: ValidateDiscountCodeParams): Promise<DiscountValidationResult> {
    try {
      // Find the discount code
      const discountCode = await db.discountCode.findFirst({
        where: {
          code: code.toUpperCase(),
          shopId,
          isActive: true,
        },
        include: {
          products: {
            select: { id: true, name: true }
          },
          variants: {
            select: { 
              id: true, 
              name: true,
              product: {
                select: { id: true, name: true }
              }
            }
          },
          category: {
            select: { id: true, name: true }
          },
          user: {
            select: { id: true, name: true }
          },
        },
      });

      if (!discountCode) {
        return {
          valid: false,
          error: "Invalid discount code",
        };
      }

      // Check if the code is expired
      const now = new Date();
      if (now < discountCode.startDate) {
        return {
          valid: false,
          error: "This discount code is not yet active",
        };
      }

      if (now > discountCode.endDate) {
        return {
          valid: false,
          error: "This discount code has expired",
        };
      }

      // Check usage limit
      if (discountCode.usageLimit && discountCode.usedCount >= discountCode.usageLimit) {
        return {
          valid: false,
          error: "This discount code has reached its usage limit",
        };
      }

      // Check if available for the current order source
      if (orderSource === 'ONLINE' && !discountCode.availableOnline) {
        return {
          valid: false,
          error: "This discount code is not available for online orders",
        };
      }

      if (orderSource === 'IN_STORE' && !discountCode.availableInStore) {
        return {
          valid: false,
          error: "This discount code is not available for in-store orders",
        };
      }

      // Check if it's user-specific
      if (discountCode.userId && discountCode.userId !== customerId) {
        return {
          valid: false,
          error: "This discount code is not available for your account",
        };
      }

      // Check product/category targeting
      const { applicable, applicableItems } = await this.checkProductApplicability(
        discountCode,
        cartItems,
        shopId
      );

      if (!applicable) {
        if (discountCode.categoryId) {
          return {
            valid: false,
            error: `This discount code only applies to products in the "${discountCode.category?.name}" category`,
          };
        } else if (discountCode.products.length > 0) {
          return {
            valid: false,
            error: "This discount code only applies to specific products not in your cart",
          };
        }
      }

      // Calculate discount amount based on applicable items
      const applicableSubtotal = applicableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discountAmount = (applicableSubtotal * discountCode.percentage) / 100;
      const orderTotal = subtotal - discountAmount;

      return {
        valid: true,
        discountCode: {
          id: discountCode.id,
          code: discountCode.code,
          percentage: discountCode.percentage,
          title: discountCode.title,
          description: discountCode.description,
        },
        discountAmount,
        orderTotal,
      };

    } catch (error) {
      console.error('Error validating discount code:', error);
      return {
        valid: false,
        error: "Failed to validate discount code",
      };
    }
  }

  /**
   * Check if discount code applies to current cart items
   */
  private static async checkProductApplicability(
    discountCode: any,
    cartItems: CartItem[],
    shopId: string
  ): Promise<{ applicable: boolean; applicableItems: CartItem[] }> {
    // If no specific targeting, applies to all items
    if (!discountCode.categoryId && discountCode.products.length === 0 && discountCode.variants.length === 0) {
      return { applicable: true, applicableItems: cartItems };
    }

    const applicableItems: CartItem[] = [];

    for (const item of cartItems) {
      let itemApplicable = false;

      // Check specific variant targeting first (most specific)
      if (discountCode.variants.length > 0) {
        const targetVariantIds = discountCode.variants.map((v: any) => v.id);
        if (item.variantId && targetVariantIds.includes(item.variantId)) {
          itemApplicable = true;
        }
      } else {
        // Get product with categories if not already loaded
        const product = item.product || await db.product.findUnique({
          where: { id: item.productId },
          include: {
            categories: {
              select: { id: true }
            }
          }
        });

        if (!product) continue;

        // Check category targeting
        if (discountCode.categoryId) {
          const productCategoryIds = product.categories.map(cat => cat.id);
          if (productCategoryIds.includes(discountCode.categoryId)) {
            itemApplicable = true;
          }
        }

        // Check specific product targeting
        if (discountCode.products.length > 0) {
          const targetProductIds = discountCode.products.map((p: any) => p.id);
          if (targetProductIds.includes(item.productId)) {
            itemApplicable = true;
          }
        }
      }

      if (itemApplicable) {
        applicableItems.push({ ...item, product: item.product });
      }
    }

    return {
      applicable: applicableItems.length > 0,
      applicableItems,
    };
  }

  /**
   * Apply discount code and increment usage count
   */
  static async applyDiscountCode(discountCodeId: string): Promise<void> {
    try {
      await db.discountCode.update({
        where: { id: discountCodeId },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    } catch (error) {
      console.error('Error applying discount code:', error);
      throw error;
    }
  }

  /**
   * Get discount code usage statistics
   */
  static async getDiscountCodeStats(discountCodeId: string) {
    try {
      const discountCode = await db.discountCode.findUnique({
        where: { id: discountCodeId },
        select: {
          id: true,
          code: true,
          usedCount: true,
          usageLimit: true,
          percentage: true,
        },
      });

      if (!discountCode) {
        throw new Error('Discount code not found');
      }

      // Get recent orders that used this discount code
      const recentOrders = await db.order.findMany({
        where: {
          discountCodeId: discountCodeId,
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          discount: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      // Calculate total discount given
      const totalDiscountGiven = await db.order.aggregate({
        where: {
          discountCodeId: discountCodeId,
        },
        _sum: {
          discount: true,
        },
      });

      return {
        ...discountCode,
        recentOrders,
        totalDiscountGiven: totalDiscountGiven._sum.discount || 0,
      };
    } catch (error) {
      console.error('Error getting discount code stats:', error);
      throw error;
    }
  }
}

export default DiscountValidationService;
