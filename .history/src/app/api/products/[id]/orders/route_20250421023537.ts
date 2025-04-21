// src/app/api/products/[id]/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const productId = params.id;

    // Verify the product exists and belongs to this shop
    const product = await db.product.findUnique({
      where: {
        id: productId,
        shopId,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get all order items for this product, even if it has been deleted
    // We can rely on stored productId or if productId is null, match on product name
    const orderItems = await db.orderItem.findMany({
      where: {
        OR: [
          { productId: productId },
          // For items where product was deleted but originally was this product
          {
            productId: null,
            productName: product.name,
          },
        ],
        order: {
          shopId, // Ensure orders belong to this shop
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(orderItems);
  } catch (error) {
    console.error("Error fetching product order history:", error);
    return NextResponse.json(
      { error: "Failed to fetch product order history" },
      { status: 500 }
    );
  }
}
