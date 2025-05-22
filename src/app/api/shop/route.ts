import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";

export async function GET(req: NextRequest) {
  try {
    // Get subdomain from the request headers or environment variable
    const subdomain = req.headers.get("x-shop-subdomain") || getSubdomain(req);

    // If no subdomain found, check if user is authenticated to get their shop
    if (!subdomain) {
      const session = await getServerSession(authOptions);

      // If no session or no shop ID, return error
      if (!session?.user?.shopId) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
      }

      // Get shop by ID from session
      const shop = await db.shop.findUnique({
        where: { id: session.user.shopId },
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
        active: shop.active,
        settings: {
          currency: shop.settings?.currency || "USD",
          language: shop.settings?.language || "en",
          timezone: shop.settings?.timezone || "UTC",
          contactEmail: shop.settings?.contactEmail,
          contactPhone: shop.settings?.contactPhone,
          address: shop.settings?.address,
          lowStockThreshold: shop.settings?.lowStockThreshold || 5,
        },
      });
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
        {
          error: "Shop not found",
          redirect: "https://store.tn",
        },
        { status: 404 }
      );
    }

    // Check if shop is active
    if (!shop.active) {
      return NextResponse.json(
        {
          error: "Shop is currently inactive",
          redirect: "https://store.tn",
        },
        { status: 403 }
      );
    }

    // Return shop data
    return NextResponse.json({
      id: shop.id,
      name: shop.name,
      subdomain: shop.subdomain,
      description: shop.description,
      logo: shop.logo,
      planType: shop.planType,
      active: shop.active,
      settings: {
        currency: shop.settings?.currency || "USD",
        language: shop.settings?.language || "en",
        timezone: shop.settings?.timezone || "UTC",
        contactEmail: shop.settings?.contactEmail,
        contactPhone: shop.settings?.contactPhone,
        address: shop.settings?.address,
        lowStockThreshold: shop.settings?.lowStockThreshold || 5,
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

// Update shop settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a shop admin
    if (!session?.user?.shopId || session.user.role !== "SHOP_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const body = await req.json();

    // Validate the request body
    const { name, description, settings } = body;

    // Update the shop
    const updatedShop = await db.shop.update({
      where: { id: shopId },
      data: {
        name: name || undefined,
        description: description || undefined,
        // Update settings if provided
        settings: settings
          ? {
              upsert: {
                create: {
                  ...settings,
                },
                update: {
                  ...settings,
                },
              },
            }
          : undefined,
      },
      include: {
        settings: true,
      },
    });

    return NextResponse.json({
      id: updatedShop.id,
      name: updatedShop.name,
      subdomain: updatedShop.subdomain,
      description: updatedShop.description,
      logo: updatedShop.logo,
      planType: updatedShop.planType,
      settings: {
        currency: updatedShop.settings?.currency || "USD",
        language: updatedShop.settings?.language || "en",
        timezone: updatedShop.settings?.timezone || "UTC",
        contactEmail: updatedShop.settings?.contactEmail,
        contactPhone: updatedShop.settings?.contactPhone,
        address: updatedShop.settings?.address,
        lowStockThreshold: updatedShop.settings?.lowStockThreshold || 5,
      },
    });
  } catch (error) {
    console.error("Error updating shop:", error);
    return NextResponse.json(
      { error: "Failed to update shop" },
      { status: 500 }
    );
  }
}
