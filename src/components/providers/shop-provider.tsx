"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Define types for shop settings
type ShopSettingsType = {
  currency: string;
  language: string;
  timezone: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  lowStockThreshold: number;
};

// Define the shape of the shop context
type ShopContextType = {
  shopId: string | null;
  shopName: string;
  shopLogo: string | null;
  shopSubdomain: string | null;
  settings: ShopSettingsType;
  planType: string;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

// Default settings values
const defaultSettings: ShopSettingsType = {
  currency: "USD",
  language: "en",
  timezone: "UTC",
  contactEmail: null,
  contactPhone: null,
  address: null,
  lowStockThreshold: 5,
};

// Default context state
const defaultState: ShopContextType = {
  shopId: null,
  shopName: "",
  shopLogo: null,
  shopSubdomain: null,
  settings: defaultSettings,
  planType: "STANDARD",
  isLoading: true,
  refetch: async () => {},
};

// Create the context
const ShopContext = createContext<ShopContextType>(defaultState);

// Hook to use the shop context
export const useShop = () => useContext(ShopContext);

// Shop provider component
export const ShopProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [shopState, setShopState] = useState<ShopContextType>(defaultState);

  // Function to fetch shop information
  const fetchShopInfo = async () => {
    try {
      setShopState((prev) => ({ ...prev, isLoading: true }));

      const res = await fetch("/api/shop");

      if (!res.ok) {
        throw new Error("Failed to fetch shop data");
      }

      const data = await res.json();

      // If there's a redirect property, the shop doesn't exist
      if (data.redirect) {
        throw new Error("Shop not found");
      }

      setShopState({
        shopId: session?.user?.shopId || null,
        shopName: data.name,
        shopLogo: data.logo,
        shopSubdomain: data.subdomain,
        settings: {
          currency: data.settings?.currency || "USD",
          language: data.settings?.language || "en",
          timezone: data.settings?.timezone || "UTC",
          contactEmail: data.settings?.contactEmail || null,
          contactPhone: data.settings?.contactPhone || null,
          address: data.settings?.address || null,
          lowStockThreshold: data.settings?.lowStockThreshold || 5,
        },
        planType: session?.user?.planType || "STANDARD",
        isLoading: false,
        refetch: fetchShopInfo,
      });
    } catch (error) {
      console.error("Failed to load shop information:", error);
      setShopState({
        ...defaultState,
        isLoading: false,
        refetch: fetchShopInfo,
      });
    }
  };

  // Effect to load shop data when component mounts or session changes
  useEffect(() => {
    if (session) {
      fetchShopInfo();
    }
  }, [session]);

  return (
    <ShopContext.Provider value={shopState}>{children}</ShopContext.Provider>
  );
};
