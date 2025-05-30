import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Get customers with filtering and sorting
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
    
    // Get query parameters
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      shopId,
      role: "CUSTOMER",
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        {
          addresses: {
            some: {
              phone: { contains: search, mode: "insensitive" }
            }
          }
        }
      ];
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === "name" || sortBy === "email" || sortBy === "createdAt") {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = "desc";
    }

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      db.user.findMany({
        where: whereClause,
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
        orderBy,
        skip,
        take: limit,
      }),
      db.user.count({ where: whereClause })
    ]);

    // Format customer data
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
      updatedAt: customer.updatedAt,
    }));

    return NextResponse.json({
      customers: formattedCustomers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

// Create a new customer
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user?.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const {
      name,
      email,
      password,
      phone,
      address,
    } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Hash password if provided, otherwise generate a random one
    const defaultPassword = password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // Create customer
    const customer = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER",
        shopId,
      },
    });

    // Create address if provided
    let customerAddress = null;
    if (address && (address.line1 || phone)) {
      customerAddress = await db.address.create({
        data: {
          name: name,
          line1: address.line1 || "",
          line2: address.line2 || null,
          city: address.city || "",
          state: address.state || "",
          postalCode: address.postalCode || "",
          country: address.country || "Tunisia",
          phone: phone || null,
          isDefault: true,
          userId: customer.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: phone || null,
        address: customerAddress,
        orderCount: 0,
        createdAt: customer.createdAt,
      },
      message: "Customer created successfully",
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
