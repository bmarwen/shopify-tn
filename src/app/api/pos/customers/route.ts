import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

// Search customers for POS
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");

    if (!query || query.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    // Search by name, email, or phone
    const customers = await db.user.findMany({
      where: {
        shopId,
        role: "CUSTOMER",
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          {
            addresses: {
              some: {
                phone: { contains: query, mode: "insensitive" }
              }
            }
          }
        ],
      },
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      take: 10,
      orderBy: {
        name: "asc",
      },
    });

    // Format customer data for POS
    const formattedCustomers = customers.map((customer) => ({
      id: customer.id,
      name: customer.name || "Unknown Customer",
      email: customer.email,
      phone: customer.addresses[0]?.phone || null,
      address: customer.addresses[0] ? {
        line1: customer.addresses[0].line1,
        line2: customer.addresses[0].line2,
        city: customer.addresses[0].city,
        state: customer.addresses[0].state,
        postalCode: customer.addresses[0].postalCode,
        country: customer.addresses[0].country,
      } : null,
      orderCount: customer._count.orders,
      createdAt: customer.createdAt,
    }));

    return NextResponse.json({ customers: formattedCustomers });
  } catch (error) {
    console.error("Error searching customers for POS:", error);
    return NextResponse.json(
      { error: "Failed to search customers" },
      { status: 500 }
    );
  }
}
