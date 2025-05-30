import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// Search products by barcode or name/SKU for POS
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode");
    const query = searchParams.get("query");

    if (!barcode && !query) {
      return NextResponse.json({ error: "Barcode or query required" }, { status: 400 });
    }

    let where: any = { shopId };

    if (barcode) {
      // Search in both product and variant barcodes
      where.OR = [
        { barcode: barcode },
        { variants: { some: { barcode: barcode } } }
      ];
    } else if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { barcode: { contains: query, mode: "insensitive" } },
        { variants: { some: { sku: { contains: query, mode: "insensitive" } } } },
        { variants: { some: { barcode: { contains: query, mode: "insensitive" } } } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: {
        variants: {
          include: {
            discounts: {
              where: {
                enabled: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
                availableInStore: true, // Only in-store discounts for POS
              },
            },
          },
        },
        discounts: {
          where: {
            enabled: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
            availableInStore: true, // Only in-store discounts for POS
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: barcode ? 1 : 10, // If searching by barcode, return only one
    });

    // Calculate final prices with discounts - now based on variants
    const productsWithPrices = products.map((product) => {
      // Process variants with their individual discounts
      const variantsWithDiscounts = product.variants.map((variant) => {
        let finalPrice = variant.price;
        let discountPercentage = 0;
        let hasDiscount = false;

        // Check for variant-specific discounts first (highest priority)
        if (variant.discounts && variant.discounts.length > 0) {
          const activeDiscount = variant.discounts[0]; // Take the first active discount
          discountPercentage = activeDiscount.percentage;
          finalPrice = variant.price * (1 - discountPercentage / 100);
          hasDiscount = true;
        }
        // Check for product-level discounts (applies to all variants)
        else if (product.discounts && product.discounts.length > 0) {
          const activeDiscount = product.discounts[0]; // Take the first active discount
          discountPercentage = activeDiscount.percentage;
          finalPrice = variant.price * (1 - discountPercentage / 100);
          hasDiscount = true;
        }

        return {
          ...variant,
          finalPrice: Number(finalPrice.toFixed(2)),
          discountPercentage,
          discountAmount: Number((variant.price - finalPrice).toFixed(2)),
          hasDiscount,
          // Remove the discounts array from the response to keep it clean
          discounts: undefined,
        };
      });
      
      return {
        ...product,
        variants: variantsWithDiscounts,
        // Product-level discount info (for display purposes)
        hasDiscount: product.discounts.length > 0,
        discountPercentage: product.discounts.length > 0 ? product.discounts[0].percentage : 0,
        // Remove the discounts array from the response to keep it clean
        discounts: undefined,
      };
    });

    return NextResponse.json({
      products: productsWithPrices,
      found: productsWithPrices.length > 0,
    });
  } catch (error) {
    console.error("Error searching products for POS:", error);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}
