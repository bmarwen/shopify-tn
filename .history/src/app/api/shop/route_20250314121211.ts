// src/app/api/shop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Get the shop from the environment or subdomain
    const subdomain = process.env.SHOP_SUBDOMAIN || "paraeljynene";

    // Check if user is authenticated (optional, depends on if you want to restrict access)
    const session = await getServerSession(authOptions);

    // Find the shop by subdomain
    const shop = await db.shop.findUnique({
      where: { subdomain },
      include: {
        settings: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Return shop data
    return NextResponse.json({
      id: shop.id,
      name: shop.name,
      subdomain: shop.subdomain,
      description: shop.description,
      logo: shop.logo,
      planType: shop.planType,
      settings: shop.settings,
    });
  } catch (error) {
    console.error("Error fetching shop data:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop data" },
      { status: 500 }
    );
  }
}
