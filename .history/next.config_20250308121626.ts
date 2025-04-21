import type { NextConfig } from "next";

const nextConfig = {
  images: {
    domains: ["localhost", "store.tn", "para.store.tn", "*.store.tn"],
  },
  env: {
    SHOP_SUBDOMAIN: process.env.SHOP_SUBDOMAIN || "para",
    MAIN_DOMAIN: process.env.MAIN_DOMAIN || "store.tn",
  },
};
export default nextConfig;
