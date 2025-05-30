import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { discountService } from "@/lib/services/discount.service";

// Validate discount code for POS
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const { code, productIds, variantIds } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: "Discount code is required" },
        { status: 400 }
      );
    }

    const validation = await discountService.validateDiscountCodeForStore(
      code,
      shopId,
      productIds || [],
      variantIds || [] // Pass variant IDs to validation
    );

    return NextResponse.json({
      success: true,
      ...validation,
    });
  } catch (error) {
    console.error("Error validating discount code:", error);
    return NextResponse.json(
      { error: "Failed to validate discount code" },
      { status: 500 }
    );
  }
}

// Search products for discount targeting
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'products'; // 'products' or 'categories'

    if (type === 'categories') {
      const categories = await discountService.searchCategories(shopId, query);
      return NextResponse.json({ categories });
    } else {
      const products = await discountService.searchProducts(shopId, query);
      return NextResponse.json({ products });
    }
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
