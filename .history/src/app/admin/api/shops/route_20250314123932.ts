// src/app/api/admin/shops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "Unauthorized. Only administrators can access this resource.",
        },
        { status: 401 }
      );
    }

    // Parse query parameters for pagination, sorting, and filtering
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("perPage") || "10", 10);
    const sortBy = searchParams.get("sort") || "createdAt";
    const sortDirection = searchParams.get("dir") || "desc";
    const searchQuery = searchParams.get("q") || "";
    const planType = searchParams.get("planType") || "";
    const active = searchParams.get("active");

    // Build where clause
    let where: any = {};

    if (searchQuery) {
      where.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { subdomain: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    if (planType) {
      where.planType = planType;
    }

    if (active !== null && active !== undefined) {
      where.active = active === "true";
    }

    // Count total shops for pagination
    const totalShops = await db.shop.count({ where });

    // Get shops with pagination, sorting, and filtering
    const shops = await db.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        subdomain: true,
        description: true,
        logo: true,
        planType: true,
        active: true,
        createdAt: true,
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
            users: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortDirection,
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({
      shops,
      pagination: {
        total: totalShops,
        page,
        perPage,
        totalPages: Math.ceil(totalShops / perPage),
      },
    });
  } catch (error) {
    console.error("Error fetching shops:", error);
    return NextResponse.json(
      { error: "Failed to fetch shops" },
      { status: 500 }
    );
  }
}
