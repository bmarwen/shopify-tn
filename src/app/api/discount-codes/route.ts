// src/app/api/discount-codes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// GET: List discount codes
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    // Build the where clause
    const where: any = { shopId };

    // Add product filter if provided
    if (productId) {
      where.productId = productId;

      // Verify the product belongs to this shop
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

    // Get discount codes
    const discountCodes = await db.discountCode.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(discountCodes);
  } catch (error) {
    console.error("Error fetching discount codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount codes" },
      { status: 500 }
    );
  }
}

// POST: Create a new discount code
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
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

    // Validate required fields
    if (!code || !percentage || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if code already exists for this shop
    const existingCode = await db.discountCode.findFirst({
      where: {
        shopId,
        code: {
          equals: code,
          mode: "insensitive", // Case insensitive
        },
      },
    });

    if (existingCode) {
      return NextResponse.json(
        { error: "A discount code with this code already exists" },
        { status: 400 }
      );
    }

    // Verify the product belongs to this shop if provided
    if (productId) {
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

    // Verify the user belongs to this shop if provided
    if (userId) {
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

    // Create the discount code
    const discountCode = await db.discountCode.create({
      data: {
        code: code.toUpperCase(), // Store in uppercase
        percentage: parseInt(percentage),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        shopId,
        productId: productId || null,
        userId: userId || null,
        isActive: isActive === true,
      },
    });

    return NextResponse.json(discountCode, { status: 201 });
  } catch (error) {
    console.error("Error creating discount code:", error);
    return NextResponse.json(
      { error: "Failed to create discount code" },
      { status: 500 }
    );
  }
}
