// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// GET a specific order
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
    const orderId = params.id;

    // Get the order with all details
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        shopId, // Ensure it belongs to this shop
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                options: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// UPDATE an order's status
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const orderId = params.id;
    const body = await req.json();

    // Extract update fields
    const { status, paymentStatus, notes } = body;

    // Validate order belongs to this shop
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        shopId,
      },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update the order
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: status || undefined,
        paymentStatus: paymentStatus || undefined,
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: true,
        items: true,
        invoice: true,
      },
    });

    // Generate automatic notification if status changed
    if (status && status !== order.status) {
      await db.notification.create({
        data: {
          title: `Order ${updatedOrder.orderNumber} Updated`,
          message: `Your order status has been updated to ${status}`,
          type: "ORDER_UPDATE",
          userId: updatedOrder.userId,
          shopId,
        },
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

// DELETE an order (soft delete or cancellation)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const orderId = params.id;

    // Validate order belongs to this shop
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        shopId,
      },
      include: {
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // For safety, we don't actually delete the order, but cancel it
    // This is to preserve order history
    const cancelledOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        paymentStatus: "FAILED",
        updatedAt: new Date(),
      },
    });

    // Restore inventory for cancelled orders
    if (order.items.length > 0) {
      for (const item of order.items) {
        if (item.variantId) {
          // Restore variant inventory
          await db.productVariant.update({
            where: { id: item.variantId },
            data: {
              inventory: {
                increment: item.quantity,
              },
            },
          });
        } else if (item.productId) {
          // Restore product inventory
          await db.product.update({
            where: { id: item.productId },
            data: {
              inventory: {
                increment: item.quantity,
              },
            },
          });
        }
      }
    }

    // Create notification
    await db.notification.create({
      data: {
        title: `Order ${order.orderNumber} Cancelled`,
        message: `Your order has been cancelled.`,
        type: "ORDER_CANCELLED",
        userId: order.userId,
        shopId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order has been cancelled",
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    return NextResponse.json(
      { error: "Failed to cancel order" },
      { status: 500 }
    );
  }
}
