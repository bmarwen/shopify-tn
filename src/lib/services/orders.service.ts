import { db } from "@/lib/prisma";

// Helper functions for date calculations
function getDateRange(dateFilter: 'today' | 'thisWeek' | 'thisMonth' | 'custom') {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (dateFilter) {
    case 'today':
      return {
        from: today,
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    
    case 'thisWeek':
      // Get Monday of current week
      const currentDay = now.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
      
      // Get Sunday of current week
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      return {
        from: monday,
        to: sunday
      };
    
    case 'thisMonth':
      // From 1st of current month to today
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      
      return {
        from: firstDayOfMonth,
        to: endOfToday
      };
    
    case 'custom':
    default:
      return null;
  }
}

export type OrdersFilter = {
  shopId: string;
  search?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
  customerId?: string;
  productId?: string;
  orderSource?: string;
  dateFilter?: 'today' | 'thisWeek' | 'thisMonth' | 'custom';
};

export type OrdersSortOptions = {
  sortField: string;
  sortOrder: "asc" | "desc";
};

export type OrdersPagination = {
  page: number;
  perPage: number;
};

export const ordersService = {
  /**
   * Get total orders count based on filters
   */
  async getTotalOrders(filters: OrdersFilter): Promise<number> {
    const where: any = { shopId: filters.shopId };

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: "insensitive" } },
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
        { user: { email: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.orderSource) {
      where.orderSource = filters.orderSource;
    }

    if (filters.customerId) {
      where.userId = filters.customerId;
    }

    if (filters.productId) {
      where.items = {
        some: { productId: filters.productId },
      };
    }

    // Handle date filtering with new options
    if (filters.dateFilter && filters.dateFilter !== 'custom') {
      const dateRange = getDateRange(filters.dateFilter);
      if (dateRange) {
        where.createdAt = {
          gte: dateRange.from,
          lte: dateRange.to,
        };
      }
    } else {
      // Custom date range
      if (filters.dateFrom) {
        where.createdAt = {
          ...(where.createdAt || {}),
          gte: filters.dateFrom,
        };
      }

      if (filters.dateTo) {
        where.createdAt = {
          ...(where.createdAt || {}),
          lte: filters.dateTo,
        };
      }
    }

    return await db.order.count({ where });
  },

  /**
   * Get orders with pagination, filtering and sorting
   */
  async getOrders(
    filters: OrdersFilter,
    pagination: OrdersPagination = { page: 1, perPage: 10 },
    sort: OrdersSortOptions = { sortField: "createdAt", sortOrder: "desc" }
  ) {
    const page =
      Number.isFinite(pagination?.page) && pagination.page > 0
        ? pagination.page
        : 1;
    const perPage =
      Number.isFinite(pagination?.perPage) && pagination.perPage > 0
        ? pagination.perPage
        : 10;

    const skip = (page - 1) * perPage;
    const take = perPage;

    const where: any = { shopId: filters.shopId };

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: "insensitive" } },
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
        { user: { email: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.orderSource) {
      where.orderSource = filters.orderSource;
    }

    if (filters.customerId) {
      where.userId = filters.customerId;
    }

    if (filters.productId) {
      where.items = {
        some: { productId: filters.productId },
      };
    }

    // Handle date filtering with new options
    if (filters.dateFilter && filters.dateFilter !== 'custom') {
      const dateRange = getDateRange(filters.dateFilter);
      if (dateRange) {
        where.createdAt = {
          gte: dateRange.from,
          lte: dateRange.to,
        };
      }
    } else {
      // Custom date range
      if (filters.dateFrom) {
        where.createdAt = {
          ...(where.createdAt || {}),
          gte: filters.dateFrom,
        };
      }

      if (filters.dateTo) {
        where.createdAt = {
          ...(where.createdAt || {}),
          lte: filters.dateTo,
        };
      }
    }

    return await db.order.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
          take: 5,
        },
        address: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
        orderPayments: {
          select: {
            id: true,
            paymentMethod: true,
            amount: true,
          },
          take: 3, // Limit to first 3 payment methods for list view
        },
        checkPayments: {
          select: {
            id: true,
            checkNumber: true,
            amount: true,
          },
          take: 2, // Limit to first 2 checks for list view
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        [sort.sortField]: sort.sortOrder,
      },
      skip,
      take,
    });
  },

  /**
   * Get order by id
   */
  async getOrderById(orderId: string, shopId: string) {
    return await db.order.findFirst({
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                slug: true,
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
        address: true,
        invoice: true,
        orderPayments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        checkPayments: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  },

  /**
   * Get order statistics
   */
  async getOrderStats(shopId: string) {
    // Get count of orders by status
    const statusCounts = await db.$queryRaw`
      SELECT status, COUNT(*) as count
      FROM "Order"
      WHERE "shopId" = ${shopId}
      GROUP BY status
    `;

    // Get count of orders by payment status
    const paymentStatusCounts = await db.$queryRaw`
      SELECT "paymentStatus", COUNT(*) as count
      FROM "Order"
      WHERE "shopId" = ${shopId}
      GROUP BY "paymentStatus"
    `;

    // Get total revenue
    const revenueResult = await db.$queryRaw`
      SELECT SUM(total) as totalRevenue
      FROM "Order"
      WHERE "shopId" = ${shopId}
      AND status != 'CANCELLED'
      AND status != 'REFUNDED'
    `;

    // Get revenue for current month
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyRevenueResult = await db.$queryRaw`
      SELECT SUM(total) as monthlyRevenue
      FROM "Order"
      WHERE "shopId" = ${shopId}
      AND status != 'CANCELLED'
      AND status != 'REFUNDED'
      AND "createdAt" >= ${firstDayOfMonth}
    `;

    return {
      statusCounts: statusCounts || [],
      paymentStatusCounts: paymentStatusCounts || [],
      totalRevenue: revenueResult[0]?.totalrevenue || 0,
      monthlyRevenue: monthlyRevenueResult[0]?.monthlyrevenue || 0,
    };
  },

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    shopId: string,
    data: {
      status?: string;
      paymentStatus?: string;
      notes?: string;
    }
  ) {
    // First check if order exists and belongs to shop
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        shopId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        userId: true,
        orderNumber: true,
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Validate status values against enums
    if (
      data.status &&
      ![
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ].includes(data.status)
    ) {
      throw new Error("Invalid order status");
    }

    if (
      data.paymentStatus &&
      !["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"].includes(
        data.paymentStatus
      )
    ) {
      throw new Error("Invalid payment status");
    }

    // Update the order
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        status: (data.status as any) || undefined,
        paymentStatus: (data.paymentStatus as any) || undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
        updatedAt: new Date(),
      },
    });

    // Create notification if status changed
    if (data.status && data.status !== order.status) {
      await db.notification.create({
        data: {
          title: `Order ${order.orderNumber} Updated`,
          message: `Your order status has been updated to ${data.status}`,
          type: "ORDER_UPDATE",
          userId: order.userId,
          shopId,
        },
      });
    }

    // Handle inventory updates when order status changes to CANCELLED or REFUNDED
    if (
      (data.status === "CANCELLED" || data.status === "REFUNDED") &&
      order.status !== "CANCELLED" &&
      order.status !== "REFUNDED"
    ) {
      // Fetch order items to restore inventory
      const orderItems = await db.orderItem.findMany({
        where: { orderId },
        select: {
          productId: true,
          variantId: true,
          quantity: true,
        },
      });

      // Restore inventory for each item
      for (const item of orderItems) {
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

    return updatedOrder;
  },
};
