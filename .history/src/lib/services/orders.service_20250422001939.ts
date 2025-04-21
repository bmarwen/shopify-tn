import { db } from "@/lib/prisma";

export interface OrderFilter {
  shopId: string;
  productId?: string;
  status?: string;
}

export interface OrderSortOptions {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export const ordersService = {
  async getOrders(
    filter: OrderFilter,
    sort: OrderSortOptions,
    page: number,
    limit: number
  ) {
    const { shopId, productId, status } = filter;
    const { sortBy, sortOrder } = sort;

    const whereClause = {
      shopId,
      ...(productId && { items: { some: { productId } } }),
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where: whereClause }),
    ]);

    return { data: orders, total };
  },

  async getOrderById(orderId: string, shopId: string) {
    return await db.order.findUnique({
      where: { id: orderId, shopId },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
    });
  },

  async createOrder(data: any) {
    return await db.order.create({ data });
  },

  async updateOrder(orderId: string, shopId: string, data: any) {
    return await db.order.update({
      where: { id: orderId, shopId },
      data,
    });
  },

  async cancelOrder(orderId: string, shopId: string) {
    return await db.order.update({
      where: { id: orderId, shopId },
      data: { status: "CANCELLED" },
    });
  },

  async getOrderCount(shopId: string) {
    return await db.order.count({ where: { shopId } });
  },
};
