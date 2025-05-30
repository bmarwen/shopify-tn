// src/lib/services/settings.service.ts
import { db } from "@/lib/prisma";

export interface ShopSettingsData {
  currency: string;
  language: string;
  timezone: string;
  lowStockThreshold: number;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: Record<string, string>;
}

export const settingsService = {
  /**
   * Get shop settings for a specific shop
   */
  async getShopSettings(shopId: string) {
    try {
      let settings = await db.shopSettings.findUnique({
        where: { shopId },
      });

      // If no settings exist, create default ones
      if (!settings) {
        settings = await db.shopSettings.create({
          data: {
            shopId,
            currency: "DT",
            language: "en",
            timezone: "UTC",
            lowStockThreshold: 5,
          },
        });
      }

      return settings;
    } catch (error) {
      console.error("Error getting shop settings:", error);
      throw error;
    }
  },

  /**
   * Update shop settings
   */
  async updateShopSettings(shopId: string, data: Partial<ShopSettingsData>) {
    try {
      // First ensure settings exist
      await this.getShopSettings(shopId);

      // Update the settings
      const updatedSettings = await db.shopSettings.update({
        where: { shopId },
        data,
      });

      return updatedSettings;
    } catch (error) {
      console.error("Error updating shop settings:", error);
      throw error;
    }
  },

  /**
   * Get currency symbol for a currency code
   */
  getCurrencySymbol(currencyCode: string): string {
    const currencySymbols: Record<string, string> = {
      DT: "د.ت", // Tunisian Dinar
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "C$",
      AUD: "A$",
      CHF: "CHF",
      CNY: "¥",
      INR: "₹",
    };

    return currencySymbols[currencyCode] || currencyCode;
  },

  /**
   * Get available currencies
   */
  getAvailableCurrencies() {
    return [
      { code: "DT", name: "Tunisian Dinar", symbol: "د.ت" },
      { code: "USD", name: "US Dollar", symbol: "$" },
      { code: "EUR", name: "Euro", symbol: "€" },
      { code: "GBP", name: "British Pound", symbol: "£" },
      { code: "JPY", name: "Japanese Yen", symbol: "¥" },
      { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
      { code: "AUD", name: "Australian Dollar", symbol: "A$" },
      { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
      { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
      { code: "INR", name: "Indian Rupee", symbol: "₹" },
    ];
  },

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    return [
      { code: "en", name: "English" },
      { code: "fr", name: "Français" },
      { code: "ar", name: "العربية" },
      { code: "es", name: "Español" },
      { code: "de", name: "Deutsch" },
      { code: "it", name: "Italiano" },
    ];
  },

  /**
   * Get available timezones
   */
  getAvailableTimezones() {
    return [
      { code: "Africa/Tunis", name: "Tunisia (GMT+1)" },
      { code: "UTC", name: "UTC (GMT+0)" },
      { code: "Europe/London", name: "London (GMT+0/+1)" },
      { code: "Europe/Paris", name: "Paris (GMT+1/+2)" },
      { code: "Europe/Berlin", name: "Berlin (GMT+1/+2)" },
      { code: "America/New_York", name: "New York (GMT-5/-4)" },
      { code: "America/Los_Angeles", name: "Los Angeles (GMT-8/-7)" },
      { code: "Asia/Tokyo", name: "Tokyo (GMT+9)" },
      { code: "Asia/Shanghai", name: "Shanghai (GMT+8)" },
      { code: "Australia/Sydney", name: "Sydney (GMT+10/+11)" },
    ];
  },
};
