// src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { settingsService } from "@/lib/services/settings.service";

// GET shop settings
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shopId = session.user.shopId;
    const settings = await settingsService.getShopSettings(shopId);

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT update shop settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SHOP_ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const shopId = session.user.shopId;
    const body = await req.json();

    // Validate input
    const {
      currency,
      language,
      timezone,
      lowStockThreshold,
      contactEmail,
      contactPhone,
      address,
      socialLinks,
    } = body;

    const updateData: any = {};

    if (currency !== undefined) updateData.currency = currency;
    if (language !== undefined) updateData.language = language;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (lowStockThreshold !== undefined) {
      const threshold = parseInt(lowStockThreshold);
      if (isNaN(threshold) || threshold < 0) {
        return NextResponse.json(
          { error: "Low stock threshold must be a positive number" },
          { status: 400 }
        );
      }
      updateData.lowStockThreshold = threshold;
    }
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (address !== undefined) updateData.address = address;
    if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedSettings = await settingsService.updateShopSettings(
      shopId,
      updateData
    );

    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
