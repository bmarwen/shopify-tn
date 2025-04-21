import { NextRequest } from "next/server";

export function getSubdomain(req: NextRequest): string | null {
  // For local development, always use the environment variable
  if (process.env.NODE_ENV === "development") {
    return process.env.SHOP_SUBDOMAIN || null;
  }

  // Get host from request headers
  const host = req.headers.get("host");
  if (!host) return null;

  // Extract subdomain from host
  const parts = host.split(".");
  if (parts.length > 2) {
    return parts[0];
  }

  return null;
}
