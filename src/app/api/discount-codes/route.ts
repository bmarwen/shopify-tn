import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { systemLimitsService } from "@/lib/services/system-limits.service";

// Create discount code with enhanced features and plan limits
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId || session.user.role !== "SHOP_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    
    // Get user's plan type
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { planType: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check discount code limit
    const limitCheck = await systemLimitsService.checkDiscountCodeLimit(shopId, shop.planType);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    const {
      code,
      title,
      description,
      image,
      percentage,
      isActive = true,
      startDate,
      endDate,
      targetType = "all",
      categoryId = null,
      productIds = [],
      variantIds = [], // Add variant IDs support
      userIds = [], // Support array of user IDs
      usageLimit = null,
      availableOnline = true,
      availableInStore = true,
    } = await req.json();

    if (!code || !percentage) {
      return NextResponse.json(
        { error: "Code and percentage are required" },
        { status: 400 }
      );
    }

    // Validate at least one availability option is selected
    if (!availableOnline && !availableInStore) {
      return NextResponse.json(
        { error: "At least one availability option (Online or In-Store) must be selected" },
        { status: 400 }
      );
    }

    // Check if code already exists in this shop
    const existingCode = await db.discountCode.findFirst({
      where: { code: code.toUpperCase(), shopId },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "Discount code already exists" },
        { status: 400 }
      );
    }

    // Validate products and variants belong to shop if provided
    if (targetType === "products") {
      if (productIds.length > 0) {
        const productCount = await db.product.count({
          where: { id: { in: productIds }, shopId },
        });
        
        if (productCount !== productIds.length) {
          return NextResponse.json(
            { error: "Some products don't belong to your shop" },
            { status: 400 }
          );
        }
      }
      
      if (variantIds.length > 0) {
        const variantCount = await db.productVariant.count({
          where: { 
            id: { in: variantIds },
            product: { shopId }
          },
        });
        
        if (variantCount !== variantIds.length) {
          return NextResponse.json(
            { error: "Some variants don't belong to your shop" },
            { status: 400 }
          );
        }
      }
      
      // Ensure at least one product or variant is selected
      if (productIds.length === 0 && variantIds.length === 0) {
        return NextResponse.json(
          { error: "At least one product or variant must be selected" },
          { status: 400 }
        );
      }
    }

    // Validate category belongs to shop if provided
    if (targetType === "category" && categoryId) {
      const category = await db.category.findFirst({
        where: { id: categoryId, shopId },
      });
      
      if (!category) {
        return NextResponse.json(
          { error: "Category not found or doesn't belong to your shop" },
          { status: 400 }
        );
      }
    }

    // Validate users belong to shop if provided
    if (targetType === "customers" && userIds.length > 0) {
      const userCount = await db.user.count({
        where: { 
          id: { in: userIds }, 
          shopId,
          role: "CUSTOMER" 
        },
      });
      
      if (userCount !== userIds.length) {
        return NextResponse.json(
          { error: "Some customers don't belong to your shop" },
          { status: 400 }
        );
      }
    }

    const discountCode = await db.discountCode.create({
      data: {
        code: code.toUpperCase(),
        title: title || null,
        description: description || null,
        image: image || null,
        percentage: parseInt(percentage),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        shopId,
        userId: targetType === "customers" && userIds.length === 1 ? userIds[0] : null, // Backward compatibility for single user
        categoryId: targetType === "category" ? categoryId : null,
        usageLimit: usageLimit || null,
        usedCount: 0,
        isActive,
        availableOnline,
        availableInStore,
        products: targetType === "products" && productIds.length > 0 ? {
          connect: productIds.map((id: string) => ({ id }))
        } : undefined,
        variants: targetType === "products" && variantIds.length > 0 ? {
          connect: variantIds.map((id: string) => ({ id }))
        } : undefined,
      },
      include: {
        products: {
          select: { id: true, name: true, images: true },
        },
        variants: {
          select: { 
            id: true, 
            name: true, 
            price: true, 
            sku: true,
            product: {
              select: { id: true, name: true }
            }
          },
        },
        category: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      discountCode,
      message: "Discount code created successfully",
    });
  } catch (error) {
    console.error("Error creating discount code:", error);
    return NextResponse.json(
      { error: "Failed to create discount code" },
      { status: 500 }
    );
  }
}

// Get discount codes with limit info
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    
    // Get shop plan type
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { planType: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Get current limit status
    const limitCheck = await systemLimitsService.checkDiscountCodeLimit(shopId, shop.planType);

    const discountCodes = await db.discountCode.findMany({
      where: { 
        shopId,
        isDeleted: false // Only show non-deleted codes
      },
      include: {
        products: {
          select: { id: true, name: true, images: true },
        },
        variants: {
          select: { 
            id: true, 
            name: true, 
            price: true, 
            sku: true,
            product: {
              select: { id: true, name: true }
            }
          },
        },
        category: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      discountCodes,
      limits: {
        current: limitCheck.current,
        limit: limitCheck.limit,
        allowed: limitCheck.allowed,
        planType: shop.planType,
      },
    });
  } catch (error) {
    console.error("Error fetching discount codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount codes" },
      { status: 500 }
    );
  }
}

// Update discount code
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId || session.user.role !== "SHOP_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const {
      id,
      code,
      title,
      description,
      image,
      percentage,
      isActive,
      startDate,
      endDate,
      targetType,
      categoryId,
      productIds = [],
      variantIds = [], // Add variant IDs support
      userIds = [], // Support array of user IDs
      usageLimit,
      availableOnline,
      availableInStore,
    } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Validate at least one availability option is selected if both are provided
    if (availableOnline !== undefined && availableInStore !== undefined && !availableOnline && !availableInStore) {
      return NextResponse.json(
        { error: "At least one availability option (Online or In-Store) must be selected" },
        { status: 400 }
      );
    }

    // Verify discount code belongs to shop
    const existingCode = await db.discountCode.findFirst({
      where: { id, shopId },
    });

    if (!existingCode) {
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 }
      );
    }

    const discountCode = await db.discountCode.update({
      where: { id },
      data: {
        code: code ? code.toUpperCase() : undefined,
        title: title !== undefined ? title || null : undefined,
        description: description !== undefined ? description || null : undefined,
        image: image !== undefined ? image || null : undefined,
        percentage: percentage ? parseInt(percentage) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        categoryId: targetType === "category" ? categoryId : null,
        userId: targetType === "customers" && userIds.length === 1 ? userIds[0] : null,
        usageLimit: usageLimit !== undefined ? usageLimit || null : undefined,
        isActive,
        availableOnline: availableOnline !== undefined ? availableOnline : undefined,
        availableInStore: availableInStore !== undefined ? availableInStore : undefined,
        products: targetType === "products" && productIds.length > 0 ? {
          set: productIds.map((id: string) => ({ id }))
        } : targetType === "products" ? { set: [] } : undefined,
        variants: targetType === "products" && variantIds.length > 0 ? {
          set: variantIds.map((id: string) => ({ id }))
        } : targetType === "products" ? { set: [] } : undefined,
      },
      include: {
        products: {
          select: { id: true, name: true, images: true },
        },
        variants: {
          select: { 
            id: true, 
            name: true, 
            price: true, 
            sku: true,
            product: {
              select: { id: true, name: true }
            }
          },
        },
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      discountCode,
      message: "Discount code updated successfully",
    });
  } catch (error) {
    console.error("Error updating discount code:", error);
    return NextResponse.json(
      { error: "Failed to update discount code" },
      { status: 500 }
    );
  }
}
