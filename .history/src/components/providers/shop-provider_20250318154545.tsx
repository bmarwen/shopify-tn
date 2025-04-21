// src/components/providers/shop-provider.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/prisma";

type ShopSettingsType = {
  currency: string;
  language: string;
  timezone: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
};

type ShopContextType = {
  shopName: string;
  shopLogo: string | null;
  settings: ShopSettingsType;
  planType: string;
  isLoading: boolean;
};

const defaultSettings: ShopSettingsType = {
  currency: "USD",
  language: "en",
  timezone: "UTC",
  contactEmail: null,
  contactPhone: null,
  address: null,
};

const defaultState: ShopContextType = {
  shopName: "",
  shopLogo: null,
  settings: defaultSettings,
  planType: "STANDARD",
  isLoading: true,
};

const ShopContext = createContext<ShopContextType>(defaultState);

export const useShop = () => useContext(ShopContext);

export const ShopProvider = ({ children }: { children: React.ReactNode }) => {
  const [shopState, setShopState] = useState<ShopContextType>(defaultState);

  useEffect(() => {
    const loadShopInfo = async () => {
      try {
        const res = await fetch("/api/shop");
        const data = await res.json();

        setShopState({
          shopName: data.name,
          shopLogo: data.logo,
          settings: {
            currency: data.settings?.currency || "USD",
            language: data.settings?.language || "en",
            timezone: data.settings?.timezone || "UTC",
            contactEmail: data.settings?.contactEmail || null,
            contactPhone: data.settings?.contactPhone || null,
            address: data.settings?.address || null,
          },
          planType: data.planType,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to load shop information:", error);
        setShopState({
          ...defaultState,
          isLoading: false,
        });
      }
    };

    loadShopInfo();
  }, []);

  return (
    <ShopContext.Provider value={shopState}>{children}</ShopContext.Provider>
  );
};
