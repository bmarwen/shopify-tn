// src/app/api/admin/shop/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get subdomain
    const subdomain = getSubdomain(req);

    // Check if subdomain matches what's in the environment variable
    if (!subdomain || subdomain !== process.env.SHOP_SUBDOMAIN) {
      return NextResponse.json(
        { error: "Shop not found", redirect: "https://store.tn" },
        { status: 404 }
      );
    }

    // Find the shop by subdomain
    const shop = await db.shop.findUnique({
      where: { subdomain },
      include: {
        settings: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            users: {
              where: { role: "CUSTOMER" },
            },
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Access control based on role
    if (session.user.role === "ADMIN") {
      // Admin has full access to all shop data
      return NextResponse.json({
        id: shop.id,
        name: shop.name,
        subdomain: shop.subdomain,
        description: shop.description,
        logo: shop.logo,
        planType: shop.planType,
        settings: shop.settings,
        owner: shop.owner,
        stats: {
          products: shop._count.products,
          orders: shop._count.orders,
          customers: shop._count.users,
        },
        isOwner: false,
        isAdmin: true,
      });
    } else if (
      session.user.role === "SHOP_ADMIN" ||
      session.user.role === "SHOP_STAFF"
    ) {
      // Check if user belongs to this shop
      if (session.user.shopId !== shop.id) {
        return NextResponse.json(
          { error: "You do not have permission to access this shop" },
          { status: 403 }
        );
      }

      // Determine if user is the owner
      const isOwner =
        session.user.role === "SHOP_ADMIN" &&
        shop.owner?.id === session.user.id;

      return NextResponse.json({
        id: shop.id,
        name: shop.name,
        subdomain: shop.subdomain,
        description: shop.description,
        logo: shop.logo,
        planType: shop.planType,
        settings: shop.settings,
        stats: {
          products: shop._count.products,
          orders: shop._count.orders,
          customers: shop._count.users,
        },
        isOwner: isOwner,
        isAdmin: false,
        role: session.user.role,
      });
    } else {
      // Customers shouldn't access admin API
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } catch (error) {
    console.error("Error fetching admin shop data:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop data" },
      { status: 500 }
    );
  }
}
