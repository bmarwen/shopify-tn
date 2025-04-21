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
      },
      include: {
        product: {
          select: {
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
      percentage,
      startDate,
      endDate,
      productId,
      userId,
      isActive,
    } = body;

    // Verify the discount code exists and belongs to this shop
    const existingCode = await db.discountCode.findFirst({
      where: {
        id: discountCodeId,
        shopId,
      },
    });

    if (!existingCode) {
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 }
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

    // Verify the product belongs to this shop if it's being changed
    if (productId && productId !== existingCode.productId) {
      const product = await db.product.findUnique({
        where: {
          id: productId,
          shopId,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }
    }

    // Verify the user belongs to this shop if it's being changed
    if (userId && userId !== existingCode.userId) {
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
        percentage: percentage !== undefined ? parseInt(percentage) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        productId: productId === undefined ? undefined : productId || null,
        userId: userId === undefined ? undefined : userId || null,
        isActive: isActive !== undefined ? isActive === true : undefined,
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

// DELETE a discount code
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
      },
    });

    if (!discountCode) {
      return NextResponse.json(
        { error: "Discount code not found" },
        { status: 404 }
      );
    }

    // Delete the discount code
    await db.discountCode.delete({
      where: { id: discountCodeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discount code:", error);
    return NextResponse.json(
      { error: "Failed to delete discount code" },
      { status: 500 }
    );
  }
}
