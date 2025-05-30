// src/app/api/discount-codes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// GET a specific discount code
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const discountCodeId = params.id;

    // Get the discount code
    const discountCode = await db.discountCode.findFirst({
      where: {
        id: discountCodeId,
        shopId,
        isDeleted: false, // Don't show soft deleted codes
      },
      include: {
        products: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!discountCode) {
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(discountCode);
  } catch (error) {
    console.error("Error fetching discount code:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount code" },
      { status: 500 }
    );
  }
}

// UPDATE a discount code
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const discountCodeId = params.id;
    const body = await req.json();
    const {
      code,
      title,
      description,
      image,
      percentage,
      startDate,
      endDate,
      targetType,
      productIds = [],
      categoryId,
      userId,
      usageLimit,
      isActive,
      availableOnline,
      availableInStore,
    } = body;

    // Verify the discount code exists and belongs to this shop
    const existingCode = await db.discountCode.findFirst({
      where: {
        id: discountCodeId,
        shopId,
        isDeleted: false, // Don't allow updating soft deleted codes
      },
    });

    if (!existingCode) {
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 }
      );
    }

    // Validate at least one availability option is selected if both are provided
    if (availableOnline !== undefined && availableInStore !== undefined && !availableOnline && !availableInStore) {
      return NextResponse.json(
        { error: "At least one availability option (Online or In-Store) must be selected" },
        { status: 400 }
      );
    }

    // Check if updated code already exists (if it's being changed)
    if (code && code !== existingCode.code) {
      const duplicateCode = await db.discountCode.findFirst({
        where: {
          shopId,
          code: {
            equals: code,
            mode: "insensitive",
          },
          id: {
            not: discountCodeId,
          },
        },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: "A discount code with this code already exists" },
          { status: 400 }
        );
      }
    }

    // Verify products belong to this shop if they're being changed
    if (targetType === "products" && productIds.length > 0) {
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

    // Verify the user belongs to this shop if provided
    if (targetType === "user" && userId) {
      const user = await db.user.findUnique({
        where: {
          id: userId,
          shopId,
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    // Update the discount code
    const updatedDiscountCode = await db.discountCode.update({
      where: { id: discountCodeId },
      data: {
        code: code ? code.toUpperCase() : undefined,
        title: title !== undefined ? title || null : undefined,
        description: description !== undefined ? description || null : undefined,
        image: image !== undefined ? image || null : undefined,
        percentage: percentage !== undefined ? parseInt(percentage) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        categoryId: targetType === "category" ? categoryId : null,
        userId: targetType === "user" ? userId : null,
        usageLimit: usageLimit !== undefined ? usageLimit || null : undefined,
        isActive: isActive !== undefined ? isActive === true : undefined,
        availableOnline: availableOnline !== undefined ? availableOnline : undefined,
        availableInStore: availableInStore !== undefined ? availableInStore : undefined,
        products: targetType === "products" && productIds.length > 0 ? {
          set: productIds.map((id: string) => ({ id }))
        } : targetType === "products" ? { set: [] } : undefined,
      },
      include: {
        products: {
          select: { id: true, name: true },
        },
        category: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updatedDiscountCode);
  } catch (error) {
    console.error("Error updating discount code:", error);
    return NextResponse.json(
      { error: "Failed to update discount code" },
      { status: 500 }
    );
  }
}

// DELETE a discount code (soft delete only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const discountCodeId = params.id;

    // Verify the discount code exists and belongs to this shop
    const discountCode = await db.discountCode.findFirst({
      where: {
        id: discountCodeId,
        shopId,
        isDeleted: false, // Don't allow deleting already deleted codes
      },
    });

    if (!discountCode) {
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 }
      );
    }

    // Always soft delete - mark as deleted and deactivate
    await db.discountCode.update({
      where: { id: discountCodeId },
      data: {
        isDeleted: true,
        isActive: false, // Deactivate to prevent further use
      },
    });

    const message = discountCode.usedCount > 0 
      ? `Discount code deleted successfully. Order history has been preserved for analytics.`
      : "Discount code deleted successfully.";

    return NextResponse.json({ 
      success: true, 
      message 
    });
  } catch (error) {
    console.error("Error deleting discount code:", error);
    return NextResponse.json(
      { error: "Failed to delete discount code" },
      { status: 500 }
    );
  }
}
