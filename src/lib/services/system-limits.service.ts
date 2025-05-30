import { db } from "@/lib/prisma";
import { PlanType } from "@prisma/client";

export interface SystemLimitCheck {
  allowed: boolean;
  limit: number;
  current: number;
  message?: string;
}

export const systemLimitsService = {
  /**
   * Get system limit by code name
   */
  async getSystemLimit(codeName: string): Promise<number> {
    const limit = await db.systemLimit.findUnique({
      where: { codeName, isActive: true },
    });
    
    return limit?.value ?? -1; // -1 means unlimited
  },

  /**
   * Check if shop can create more discounts
   */
  async checkDiscountLimit(shopId: string, planType: PlanType): Promise<SystemLimitCheck> {
    const limitCodeName = `${planType}_DISCOUNTS_LIMIT`;
    const limit = await this.getSystemLimit(limitCodeName);
    
    if (limit === -1) {
      return { allowed: true, limit: -1, current: 0 };
    }
    
    const currentCount = await db.discount.count({
      where: {
        product: { shopId },
        enabled: true,
      },
    });
    
    return {
      allowed: currentCount < limit,
      limit,
      current: currentCount,
      message: currentCount >= limit ? `You have reached the maximum of ${limit} active discounts for your ${planType.toLowerCase()} plan.` : undefined,
    };
  },

  /**
   * Check if shop can create more discount codes
   */
  async checkDiscountCodeLimit(shopId: string, planType: PlanType): Promise<SystemLimitCheck> {
    const limitCodeName = `${planType}_DISCOUNT_CODES_LIMIT`;
    const limit = await this.getSystemLimit(limitCodeName);
    
    if (limit === -1) {
      return { allowed: true, limit: -1, current: 0 };
    }
    
    const currentCount = await db.discountCode.count({
      where: {
        shopId,
        isActive: true,
      },
    });
    
    return {
      allowed: currentCount < limit,
      limit,
      current: currentCount,
      message: currentCount >= limit ? `You have reached the maximum of ${limit} active discount codes for your ${planType.toLowerCase()} plan.` : undefined,
    };
  },

  /**
   * Get all system limits for a plan type
   */
  async getPlanLimits(planType: PlanType) {
    const limits = await db.systemLimit.findMany({
      where: {
        planType,
        isActive: true,
      },
    });
    
    return limits.reduce((acc, limit) => {
      acc[limit.codeName] = limit.value;
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Update system limit (for super admin)
   */
  async updateSystemLimit(codeName: string, value: number) {
    return await db.systemLimit.update({
      where: { codeName },
      data: { value, updatedAt: new Date() },
    });
  },

  /**
   * Create new system limit
   */
  async createSystemLimit(data: {
    codeName: string;
    name: string;
    description?: string;
    value: number;
    category: string;
    planType?: PlanType;
  }) {
    return await db.systemLimit.create({
      data,
    });
  },
};
