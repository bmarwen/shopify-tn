// src/app/api/discounts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// GET a specific discount
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
    const discountId = params.id;

    // Get the discount with validation that it belongs to a product in this shop
    const discount = await db.discount.findFirst({
      where: {
        id: discountId,
        product: {
          shopId,
        },
      },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(discount);
  } catch (error) {
    console.error("Error fetching discount:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount" },
      { status: 500 }
    );
  }
}

// UPDATE a discount
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
    const discountId = params.id;
    const body = await req.json();
    const { percentage, enabled, startDate, endDate, productId } = body;

    // Verify the discount exists and belongs to a product in this shop
    const existingDiscount = await db.discount.findFirst({
      where: {
        id: discountId,
        product: {
          shopId,
        },
      },
    });

    if (!existingDiscount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    // Verify the product belongs to this shop if it's being changed
    if (productId && productId !== existingDiscount.productId) {
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

    // Update the discount
    const updatedDiscount = await db.discount.update({
      where: { id: discountId },
      data: {
        percentage:
          percentage !== undefined ? parseFloat(percentage) : undefined,
        enabled: enabled !== undefined ? enabled === true : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        productId: productId || undefined,
      },
    });

    return NextResponse.json(updatedDiscount);
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json(
      { error: "Failed to update discount" },
      { status: 500 }
    );
  }
}

// DELETE a discount
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
    const discountId = params.id;

    // Verify the discount exists and belongs to a product in this shop
    const discount = await db.discount.findFirst({
      where: {
        id: discountId,
        product: {
          shopId,
        },
      },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    // Delete the discount
    await db.discount.delete({
      where: { id: discountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discount:", error);
    return NextResponse.json(
      { error: "Failed to delete discount" },
      { status: 500 }
    );
  }
}
