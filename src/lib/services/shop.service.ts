// src/lib/services/shop.service.ts
import { db } from "@/lib/prisma";

export const shopService = {
  /**
   * Get shop by subdomain
   */
  async getShopBySubdomain(subdomain: string) {
    return await db.shop.findUnique({
      where: { subdomain },
      include: {
        settings: true,
      },
    });
  },

  /**
   * Get shop by ID
   */
  async getShopById(shopId: string) {
    return await db.shop.findUnique({
      where: { id: shopId },
      include: {
        settings: true,
      },
    });
  },

  /**
   * Get shop settings
   */
  async getShopSettings(shopId: string) {
    return await db.shopSettings.findUnique({
      where: { shopId },
    });
  },

  /**
   * Check if shop exists
   */
  async shopExists(shopId: string): Promise<boolean> {
    const count = await db.shop.count({
      where: { id: shopId },
    });
    return count > 0;
  },
};
