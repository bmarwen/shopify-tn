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

    // Get the discount with enhanced relations
    const discount = await db.discount.findFirst({
      where: {
        id: discountId,
        isDeleted: false, // Don't show soft deleted discounts
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
        ]
      },
      include: {
        // Legacy relations
        product: {
          select: { 
            id: true, 
            name: true, 
            sku: true,
            barcode: true,
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                barcode: true,
                inventory: true,
                options: true,
              }
            }
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            sku: true,
            barcode: true,
            inventory: true,
            options: true,
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
          select: { 
            id: true, 
            name: true, 
            sku: true,
            barcode: true,
            variants: {
              select: {
                id: true,
                name: true,
                price: true,
                sku: true,
                barcode: true,
                inventory: true,
                options: true,
              }
            }
          },
        },
        variants: {
          select: { 
            id: true, 
            name: true, 
            price: true,
            sku: true,
            barcode: true,
            inventory: true,
            options: true,
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

// UPDATE a discount (targeting cannot be changed)
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
    const { 
      title, 
      description, 
      image, 
      percentage, 
      enabled, 
      startDate, 
      endDate,
      availableOnline,
      availableInStore 
    } = body;

    // Verify the discount exists and belongs to this shop
    const existingDiscount = await db.discount.findFirst({
      where: {
        id: discountId,
        isDeleted: false, // Don't allow updating soft deleted discounts
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
        ]
      },
    });

    if (!existingDiscount) {
      return NextResponse.json(
        { error: "Discount not found" },
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

    // Update the discount (excluding targeting fields)
    const updatedDiscount = await db.discount.update({
      where: { id: discountId },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        image: image !== undefined ? image : undefined,
        percentage: percentage !== undefined ? parseFloat(percentage) : undefined,
        enabled: enabled !== undefined ? enabled === true : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        availableOnline: availableOnline !== undefined ? availableOnline : undefined,
        availableInStore: availableInStore !== undefined ? availableInStore : undefined,
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
      discount: updatedDiscount,
      message: "Discount updated successfully"
    });
  } catch (error) {
    console.error("Error updating discount:", error);
    return NextResponse.json(
      { error: "Failed to update discount" },
      { status: 500 }
    );
  }
}

// DELETE a discount (soft delete only)
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

    // Verify the discount exists and belongs to this shop
    const discount = await db.discount.findFirst({
      where: {
        id: discountId,
        isDeleted: false, // Don't allow deleting already deleted discounts
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
        ]
      },
    });

    if (!discount) {
      return NextResponse.json(
        { error: "Discount not found" },
        { status: 404 }
      );
    }

    // Always soft delete - mark as deleted and deactivate
    await db.discount.update({
      where: { id: discountId },
      data: {
        isDeleted: true,
        enabled: false, // Deactivate to prevent further use
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Discount deleted successfully. Order history has been preserved for analytics." 
    });
  } catch (error) {
    console.error("Error deleting discount:", error);
    return NextResponse.json(
      { error: "Failed to delete discount" },
      { status: 500 }
    );
  }
}
