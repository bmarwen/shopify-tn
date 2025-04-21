// src/app/admin/page.tsx
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { canViewAdvancedStats } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  Users,
  DollarSign,
  Package,
} from "lucide-react";
import { SubscriptionInfo } from "@/components/admin/subscription-info";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    return <div>Shop not found</div>;
  }

  const shopId = session.user.shopId;

  // Get shop data with subscription
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    include: {
      settings: true,
      subscription: {
        include: {
          payments: true,
        },
      },
    },
  });

  if (!shop) {
    return <div>Shop not found</div>;
  }

  // Get count of products
  const productCount = await db.product.count({
    where: { shopId },
  });

  // Get count of customers
  const customerCount = await db.user.count({
    where: {
      shopId,
      role: "CUSTOMER",
    },
  });

  // Get count of orders
  const orderCount = await db.order.count({
    where: { shopId },
  });

  // Get total revenue
  const ordersWithTotal = await db.order.findMany({
    where: {
      shopId,
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    select: { total: true },
  });

  const totalRevenue = ordersWithTotal.reduce(
    (sum, order) => sum + order.total,
    0
  );

  // Get recent orders
  const recentOrders = await db.order.findMany({
    where: { shopId },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Get low stock products
  const lowStockProducts = await db.product.findMany({
    where: {
      shopId,
      lowStockAlert: true,
    },
    take: 5,
  });

  // Prepare subscription data for the component
  let subscriptionData = null;
  if (shop.subscription) {
    const sub = shop.subscription;

    // Calculate total paid amount
    const paidAmount = sub.payments
      .filter((payment) => payment.status === "COMPLETED")
      .reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate days remaining
    const now = new Date();
    const endDate = new Date(sub.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    subscriptionData = {
      id: sub.id,
      planType: shop.planType,
      period: sub.period,
      startDate: sub.startDate.toISOString(),
      endDate: sub.endDate.toISOString(),
      status: sub.status,
      totalAmount: sub.totalAmount,
      appliedDiscount: sub.appliedDiscount,
      paidAmount,
      remainingAmount: Math.max(0, sub.totalAmount - paidAmount),
      daysRemaining,
      isActive: sub.status === "ACTIVE" && endDate > now,
    };
  }

  // Check if the user can view advanced stats
  const showAdvancedStats = canViewAdvancedStats(session.user);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-700">
        Dashboardd
      </h1>

      {/* Subscription Information (only for SHOP_ADMIN) */}
      <SubscriptionInfo subscription={subscriptionData} />

      {/* Basic Stats - available to all */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-gray-500">
              {lowStockProducts.length} with low stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
            <p className="text-xs text-gray-500">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderCount}</div>
            <p className="text-xs text-gray-500">Total orders</p>
          </CardContent>
        </Card>

        {/* Revenue - Only shown for ADVANCED/PREMIUM */}
        {showAdvancedStats && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRevenue)}
              </div>
              <p className="text-xs text-gray-500">
                Total from {orderCount} orders
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Advanced stats - Only shown for ADVANCED/PREMIUM */}
      {showAdvancedStats && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.user.name || order.user.email}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        {formatCurrency(order.total)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No orders yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Low Stock Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map((product) => (
                    <div key={product.id} className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.inventory} units left
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        {formatCurrency(product.price)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No low stock products</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
