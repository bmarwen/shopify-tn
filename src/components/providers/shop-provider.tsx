// src/components/providers/shop-provider.tsx
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
  error: string | null;
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
  error: null,
  refetch: async () => {},
};

// Create the context
const ShopContext = createContext<ShopContextType>(defaultState);

// Hook to use the shop context
export const useShop = () => useContext(ShopContext);

// Shop provider component
export const ShopProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status: sessionStatus } = useSession();
  const [shopState, setShopState] = useState<ShopContextType>(defaultState);

  // Function to fetch shop information
  const fetchShopInfo = async () => {
    try {
      setShopState((prev) => ({ ...prev, isLoading: true, error: null }));

      const res = await fetch("/api/shop", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // If there's a redirect property, the shop doesn't exist
      if (data.redirect) {
        throw new Error("Shop not found or inactive");
      }

      setShopState({
        shopId: session?.user?.shopId || data.id || null,
        shopName: data.name || "",
        shopLogo: data.logo || null,
        shopSubdomain: data.subdomain || null,
        settings: {
          currency: data.settings?.currency || "USD",
          language: data.settings?.language || "en",
          timezone: data.settings?.timezone || "UTC",
          contactEmail: data.settings?.contactEmail || null,
          contactPhone: data.settings?.contactPhone || null,
          address: data.settings?.address || null,
          lowStockThreshold: data.settings?.lowStockThreshold || 5,
        },
        planType: session?.user?.planType || data.planType || "STANDARD",
        isLoading: false,
        error: null,
        refetch: fetchShopInfo,
      });
    } catch (error) {
      console.error("Failed to load shop information:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load shop information";
      
      setShopState({
        ...defaultState,
        isLoading: false,
        error: errorMessage,
        refetch: fetchShopInfo,
      });
    }
  };

  // Effect to load shop data when component mounts or session changes
  useEffect(() => {
    // Only fetch if session is loaded and we have a user
    if (sessionStatus === "loading") {
      return; // Wait for session to load
    }

    if (sessionStatus === "authenticated" && session?.user) {
      fetchShopInfo().catch((error) => {
        console.error("Unhandled error in fetchShopInfo:", error);
      });
    } else if (sessionStatus === "unauthenticated") {
      // User is not authenticated, set default state
      setShopState({
        ...defaultState,
        isLoading: false,
        error: null,
      });
    }
  }, [session, sessionStatus]);

  return (
    <ShopContext.Provider value={shopState}>{children}</ShopContext.Provider>
  );
};
