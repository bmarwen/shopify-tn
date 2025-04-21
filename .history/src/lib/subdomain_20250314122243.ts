// src/lib/subdomain.ts
import { NextRequest } from "next/server";

export function getSubdomain(req: NextRequest): string | null {
  // Get host from request headers
  const host = req.headers.get("host");

  if (!host) return null;

  // Skip localhost in development
  if (host.includes("localhost")) {
    return process.env.SHOP_SUBDOMAIN || null;
  }

  // Get main domain from env or use default
  const mainDomain = process.env.MAIN_DOMAIN || "store.tn";

  // Parse subdomain
  if (host.includes(mainDomain)) {
    const subdomain = host.replace(`.${mainDomain}`, "");

    // If the host is exactly the main domain, there's no subdomain
    if (subdomain === mainDomain) {
      return null;
    }

    return subdomain;
  }

  return null;
}
