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

    // First check if the user has a shop they own (for SHOP_ADMIN)
    if (session.user.role === "SHOP_ADMIN" && session.user.shopId) {
      const shop = await db.shop.findUnique({
        where: { id: session.user.shopId },
        include: {
          settings: true,
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

      if (shop) {
        // Ensure the user is accessing their own shop's subdomain
        if (subdomain && shop.subdomain !== subdomain) {
          return NextResponse.json(
            { error: "You do not have permission to access this shop" },
            { status: 403 }
          );
        }

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
        });
      }
    }

    // For SHOP_STAFF, get the shop they are associated with
    else if (session.user.role === "SHOP_STAFF" && session.user.shopId) {
      const shop = await db.shop.findUnique({
        where: { id: session.user.shopId },
        include: {
          settings: true,
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

      if (shop) {
        // Ensure the user is accessing their own shop's subdomain
        if (subdomain && shop.subdomain !== subdomain) {
          return NextResponse.json(
            { error: "You do not have permission to access this shop" },
            { status: 403 }
          );
        }

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
        });
      }
    }

    // For ADMIN, they can access any shop if a valid subdomain is provided
    else if (session.user.role === "ADMIN" && subdomain) {
      const shop = await db.shop.findUnique({
        where: { subdomain },
        include: {
          settings: true,
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

      if (shop) {
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
        });
      }
    }

    // If we got here, the user doesn't have access to shop data
    return NextResponse.json(
      { error: "Shop not found or you do not have permission to access it" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching admin shop data:", error);
    return NextResponse.json(
      { error: "Failed to fetch shop data" },
      { status: 500 }
    );
  }
}
