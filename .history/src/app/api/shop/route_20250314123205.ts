// src/app/api/shop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";

export async function GET(req: NextRequest) {
  try {
    // Get subdomain from the request or environment
    const subdomain = getSubdomain(req);

    // If no subdomain found or it doesn't match the expected one, redirect to main domain
    if (!subdomain || subdomain !== process.env.SHOP_SUBDOMAIN) {
      // Redirect to main domain
      return NextResponse.json(
        { redirect: "https://store.tn" },
        { status: 307 }
      );
    }

    // Find the shop by subdomain
    const shop = await db.shop.findUnique({
      where: { subdomain },
      include: {
        settings: true,
      },
    });

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found", redirect: "https://store.tn" },
        { status: 404 }
      );
    }

    // Return shop data
    return NextResponse.json({
      name: shop.name,
      subdomain: shop.subdomain,
      description: shop.description,
      logo: shop.logo,
      settings: {
        currency: shop.settings?.currency || "USD",
        language: shop.settings?.language || "en",
        contactEmail: shop.settings?.contactEmail,
        contactPhone: shop.settings?.contactPhone,
      },
    });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop data" },
      { status: 500 }
    );
  }
}
