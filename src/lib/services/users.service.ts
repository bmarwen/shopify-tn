// src/lib/services/users.service.ts
import { db } from "@/lib/prisma";

export const usersService = {
  /**
   * Get a user by ID with validation that they belong to a shop
   */
  async getUserById(userId: string, shopId: string) {
    return await db.user.findUnique({
      where: {
        id: userId,
        shopId, // Ensure it belongs to this shop
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  },

  /**
   * Search users by name or email within a shop
   */
  async searchUsers(query: string, shopId: string, limit = 10) {
    return await db.user.findMany({
      where: {
        shopId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      take: limit,
    });
  },

  /**
   * Get total users count for a shop
   */
  async getTotalUsers(shopId: string, role?: string) {
    return await db.user.count({
      where: {
        shopId,
        ...(role ? { role } : {}),
      },
    });
  },

  /**
   * Get users with pagination and filtering
   */
  async getUsers(
    shopId: string,
    {
      page = 1,
      perPage = 10,
      search = "",
      role = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    }: {
      page: number;
      perPage: number;
      search?: string;
      role?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const skip = (page - 1) * perPage;

    const where: any = { shopId };

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Add role filter
    if (role) {
      where.role = role;
    }

    return await db.user.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: perPage,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
          },
          take: 1,
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
  },
};
