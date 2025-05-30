import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { systemLimitsService } from "@/lib/services/system-limits.service";

// Create discount with enhanced multi-targeting support
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId || session.user.role !== "SHOP_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const values = await req.json();
    
    // Get user's plan type
    const shop = await db.shop.findUnique({
      where: { id: shopId },
      select: { planType: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Check discount limit
    const limitCheck = await systemLimitsService.checkDiscountLimit(shopId, shop.planType);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message },
        { status: 403 }
      );
    }

    const {
      targetType = "single",
      // Legacy single product fields
      productId,
      variantId,
      // Multi-targeting fields
      categoryId,
      productIds = [],
      variantIds = [],
      // Other fields
      title,
      description,
      image,
      percentage,
      startDate,
      endDate,
      availableOnline = true,
      availableInStore = true,
      enabled = true,
    } = values;

    if (!percentage) {
      return NextResponse.json(
        { error: "Percentage is required" },
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

    // Validate targeting based on type
    if (targetType === "category" && !categoryId) {
      return NextResponse.json(
        { error: "Category is required for category targeting" },
        { status: 400 }
      );
    }

    if (targetType === "products" && productIds.length === 0 && variantIds.length === 0) {
      return NextResponse.json(
        { error: "At least one product or variant is required for multi-product targeting" },
        { status: 400 }
      );
    }

    // Verify products and variants belong to shop if provided
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
    }

    // Verify category belongs to shop if provided
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

    // Verify single product belongs to shop if provided (legacy support)
    if (targetType === "single" && productId) {
      const product = await db.product.findFirst({
        where: { id: productId, shopId },
      });
      
      if (!product) {
        return NextResponse.json(
          { error: "Product not found or doesn't belong to your shop" },
          { status: 400 }
        );
      }

      // If variant ID is provided, verify it belongs to the product
      if (variantId) {
        const variant = await db.productVariant.findFirst({
          where: { 
            id: variantId, 
            productId: productId 
          },
        });

        if (!variant) {
          return NextResponse.json(
            { error: "Variant not found or doesn't belong to the selected product" },
            { status: 400 }
          );
        }
      }
    }

    // Create discount with appropriate targeting
    const discountData: any = {
      title: title || null,
      description: description || null,
      image: image || null,
      percentage: parseInt(percentage),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      availableOnline,
      availableInStore,
      enabled,
    };

    // Set targeting based on type
    if (targetType === "single") {
      // Legacy single product support - map to new structure
      if (variantId) {
        discountData.variants = {
          connect: [{ id: variantId }]
        };
      } else if (productId) {
        discountData.products = {
          connect: [{ id: productId }]
        };
      }
    } else if (targetType === "category") {
      discountData.categoryId = categoryId;
    } else if (targetType === "products") {
      if (productIds.length > 0) {
        discountData.products = {
          connect: productIds.map((id: string) => ({ id }))
        };
      }
      if (variantIds.length > 0) {
        discountData.variants = {
          connect: variantIds.map((id: string) => ({ id }))
        };
      }
    }
    // For "all" targetType, no specific targeting is set

    const discount = await db.discount.create({
      data: discountData,
      include: {
        // Legacy relations
        product: {
          select: { 
            id: true, 
            name: true, 
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
              },
              take: 3
            }
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // Multi-targeting relations
        products: {
          select: { id: true, name: true },
        },
        variants: {
          select: { 
            id: true, 
            name: true, 
            price: true, 
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
      discount,
      message: "Discount created successfully",
    });
  } catch (error) {
    console.error("Error creating discount:", error);
    return NextResponse.json(
      { error: "Failed to create discount" },
      { status: 500 }
    );
  }
}

// Get discounts with enhanced relations
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
    const limitCheck = await systemLimitsService.checkDiscountLimit(shopId, shop.planType);

    const discounts = await db.discount.findMany({
      where: {
        isDeleted: false, // Only show non-deleted discounts
        OR: [
          // Legacy single product/variant discounts
          {
            product: { shopId },
          },
          {
            variant: {
              product: { shopId }
            }
          },
          // Multi-targeting discounts (products)
          {
            products: {
              some: {
                shopId: shopId
              }
            }
          },
          // Multi-targeting discounts (variants)
          {
            variants: {
              some: {
                product: {
                  shopId: shopId
                }
              }
            }
          },
          // Category targeting
          {
            category: {
              shopId: shopId
            }
          },
          // Global discounts (targeting all products)
          {
            AND: [
              { productId: null },
              { variantId: null },
              { categoryId: null },
              { products: { none: {} } },
              { variants: { none: {} } }
            ]
          }
        ]
      },
      include: {
        // Legacy relations
        product: {
          select: { 
            id: true, 
            name: true, 
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
              },
              take: 3
            }
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // Multi-targeting relations
        products: {
          select: { id: true, name: true },
          take: 3, // Limit for display
        },
        variants: {
          select: { 
            id: true, 
            name: true, 
            price: true,
            product: {
              select: { id: true, name: true }
            }
          },
          take: 3, // Limit for display
        },
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      discounts,
      limits: {
        current: limitCheck.current,
        limit: limitCheck.limit,
        allowed: limitCheck.allowed,
        planType: shop.planType,
      },
    });
  } catch (error) {
    console.error("Error fetching discounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}
