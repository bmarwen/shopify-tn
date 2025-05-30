import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Get a specific customer
export async function GET(
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
    const customerId = params.id;

    const customer = await db.user.findFirst({
      where: {
        id: customerId,
        shopId,
        role: "CUSTOMER",
      },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Calculate total spent
    const totalSpent = await db.order.aggregate({
      where: {
        userId: customerId,
        shopId,
        paymentStatus: "COMPLETED",
      },
      _sum: {
        total: true,
      },
    });

    const formattedCustomer = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      addresses: customer.addresses,
      orders: customer.orders,
      orderCount: customer._count.orders,
      totalSpent: totalSpent._sum.total || 0,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };

    return NextResponse.json(formattedCustomer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

// Update a customer
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
    const customerId = params.id;
    const {
      name,
      email,
      password,
      phone,
      address,
    } = await req.json();

    // Verify customer exists and belongs to shop
    const existingCustomer = await db.user.findFirst({
      where: {
        id: customerId,
        shopId,
        role: "CUSTOMER",
      },
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if email is being changed and already exists
    if (email && email !== existingCustomer.email) {
      const emailExists = await db.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    // Update customer
    const updatedCustomer = await db.user.update({
      where: { id: customerId },
      data: updateData,
    });

    // Update or create address
    let customerAddress = null;
    if (address || phone) {
      const existingAddress = existingCustomer.addresses[0];
      
      if (existingAddress) {
        // Update existing address
        customerAddress = await db.address.update({
          where: { id: existingAddress.id },
          data: {
            name: name || existingAddress.name,
            line1: address?.line1 !== undefined ? address.line1 : existingAddress.line1,
            line2: address?.line2 !== undefined ? address.line2 : existingAddress.line2,
            city: address?.city !== undefined ? address.city : existingAddress.city,
            state: address?.state !== undefined ? address.state : existingAddress.state,
            postalCode: address?.postalCode !== undefined ? address.postalCode : existingAddress.postalCode,
            country: address?.country !== undefined ? address.country : existingAddress.country,
            phone: phone !== undefined ? phone : existingAddress.phone,
          },
        });
      } else if (address?.line1 || phone) {
        // Create new address
        customerAddress = await db.address.create({
          data: {
            name: name || updatedCustomer.name || "",
            line1: address?.line1 || "",
            line2: address?.line2 || null,
            city: address?.city || "",
            state: address?.state || "",
            postalCode: address?.postalCode || "",
            country: address?.country || "Tunisia",
            phone: phone || null,
            isDefault: true,
            userId: customerId,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        phone: customerAddress?.phone || phone,
        address: customerAddress,
        updatedAt: updatedCustomer.updatedAt,
      },
      message: "Customer updated successfully",
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

// Delete a customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.shopId ||
      session.user.role !== "SHOP_ADMIN"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const customerId = params.id;

    // Verify customer exists and belongs to shop
    const customer = await db.user.findFirst({
      where: {
        id: customerId,
        shopId,
        role: "CUSTOMER",
      },
      include: {
        orders: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has orders
    if (customer.orders.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete customer with existing orders. Consider deactivating instead." },
        { status: 400 }
      );
    }

    // Delete customer (addresses will be deleted due to cascade)
    await db.user.delete({
      where: { id: customerId },
    });

    return NextResponse.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
