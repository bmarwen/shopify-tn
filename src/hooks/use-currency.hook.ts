// src/hooks/use-currency.hook.ts
import { useShopSettings } from "@/contexts/shop-settings.context";

export function useCurrency() {
  const { settings, getCurrencySymbol } = useShopSettings();

  const formatPrice = (amount: number): string => {
    if (!settings) return `${amount.toFixed(2)} DT`; // Fallback
    
    const symbol = getCurrencySymbol();
    const formattedAmount = Number(amount).toFixed(2);
    
    // For DT, put symbol after the amount
    if (settings.currency === "DT") {
      return `${formattedAmount} ${symbol}`;
    }
    
    // For other currencies, put symbol before
    return `${symbol}${formattedAmount}`;
  };

  return {
    currency: settings?.currency || "DT",
    currencySymbol: getCurrencySymbol(),
    formatPrice,
  };
}
