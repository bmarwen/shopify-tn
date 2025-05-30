// src/contexts/shop-settings.context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ShopSettings {
  id: string;
  shopId: string;
  currency: string;
  language: string;
  timezone: string;
  lowStockThreshold: number;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface ShopSettingsContextType {
  settings: ShopSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (data: Partial<ShopSettings>) => Promise<void>;
  getCurrencySymbol: () => string;
}

const ShopSettingsContext = createContext<ShopSettingsContextType | undefined>(
  undefined
);

export function ShopSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    if (!session?.user?.shopId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/settings");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error("Error fetching shop settings:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: Partial<ShopSettings>) => {
    if (!session?.user?.shopId) {
      throw new Error("No shop ID available");
    }

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update settings");
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);
    } catch (err) {
      console.error("Error updating shop settings:", err);
      throw err;
    }
  };

  const getCurrencySymbol = (): string => {
    const currencySymbols: Record<string, string> = {
      DT: "DT", // Tunisian Dinar
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

    return currencySymbols[settings?.currency || "DT"] || settings?.currency || "DT";
  };

  useEffect(() => {
    if (session?.user?.shopId) {
      fetchSettings();
    }
  }, [session?.user?.shopId]);

  const value: ShopSettingsContextType = {
    settings,
    loading,
    error,
    refreshSettings: fetchSettings,
    updateSettings,
    getCurrencySymbol,
  };

  return (
    <ShopSettingsContext.Provider value={value}>
      {children}
    </ShopSettingsContext.Provider>
  );
}

export function useShopSettings() {
  const context = useContext(ShopSettingsContext);
  if (context === undefined) {
    throw new Error("useShopSettings must be used within a ShopSettingsProvider");
  }
  return context;
}
