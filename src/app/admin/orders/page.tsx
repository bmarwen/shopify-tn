import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ordersService } from "@/lib/services/orders.service";
import { productsService } from "@/lib/services/products.service";
import { usersService } from "@/lib/services/users.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FeatureGuard } from "@/components/authorization/feature-guard";
import { Feature } from "@/lib/feature-authorization";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import OrderFilters from "@/components/admin/order-filters";
import Pagination from "@/components/admin/pagination";
import OrderStatusBadge from "@/components/admin/order-status-badge";
import OrderListActions from "@/components/admin/order-list-actions";
import { serializeBigInt } from "@/lib/serializer";

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  // Await searchParams here:
  const params = await searchParams;

  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/orders");
  }
  const shopId = session.user.shopId;

  // Safely extract search parameters from the URL
  const page = parseInt((params.page as string) || "1");
  const perPage = parseInt((params.perPage as string) || "10");
  const sort = (params.sort as string) || "createdAt";
  const order = (params.order as string) || "desc";
  const search = (params.search as string) || "";
  const status = (params.status as string) || "";
  const paymentStatus = (params.paymentStatus as string) || "";
  const product = (params.product as string) || undefined;
  const customer = (params.customer as string) || undefined;
  const dateFrom = (params.dateFrom as string) || undefined;
  const dateTo = (params.dateTo as string) || undefined;

  // Parse date filters safely
  let dateFromObj = undefined;
  let dateToObj = undefined;

  if (dateFrom) {
    dateFromObj = new Date(dateFrom);
  }

  if (dateTo) {
    dateToObj = new Date(dateTo);
    // Set to end of day
    dateToObj.setHours(23, 59, 59, 999);
  }

  // Prepare filters
  const filters = {
    shopId,
    search,
    status,
    paymentStatus,
    dateFrom: dateFromObj,
    dateTo: dateToObj,
    customerId: customer,
    productId: product,
  };

  // Prepare pagination
  const pagination = {
    page,
    perPage,
  };

  // Prepare sorting
  const sortOptions = {
    sortField: sort,
    sortOrder: order as "asc" | "desc",
  };

  // Get total orders count for pagination
  const totalOrders = await ordersService.getTotalOrders(filters);

  // Calculate total pages
  const totalPages = Math.ceil(totalOrders / perPage);

  // Get orders with pagination and sorting
  const orders = await ordersService.getOrders(
    filters,
    pagination,
    sortOptions
  );

  // Get order statistics
  const orderStats = await ordersService.getOrderStats(shopId);

  // Get product info if filtering by product
  let productInfo = null;
  if (product) {
    productInfo = await productsService.getProductById(product, shopId);
  }

  // Get customer info if filtering by customer
  let customerInfo = null;
  if (customer) {
    customerInfo = await usersService.getUserById(customer, shopId);
  }

  // Prepare safe filter parameters for passing to client components
  const currentFilters = {
    search: search || undefined,
    status: status || undefined,
    paymentStatus: paymentStatus || undefined,
    dateFrom: dateFromObj ? dateFromObj.toISOString().split("T")[0] : undefined,
    dateTo: dateToObj ? dateToObj.toISOString().split("T")[0] : undefined,
    page: page.toString(),
    perPage: perPage.toString(),
    sort,
    order,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            {productInfo
              ? `Orders for ${productInfo.name}`
              : customerInfo
              ? `Orders for ${customerInfo.name || customerInfo.email}`
              : "Orders"}
          </h1>
          <p className="text-gray-500 mt-1">
            {(productInfo || customerInfo) && (
              <Link
                href="/admin/orders"
                className="text-indigo-600 hover:underline"
              >
                View all orders
              </Link>
            )}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {totalOrders}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(orderStats.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(orderStats.monthlyRevenue)}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Generation - only for Advanced and Premium plans */}
        <FeatureGuard
          feature={Feature.INVOICE_GENERATION}
          fallback={
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">
                  Pending Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {serializeBigInt(orderStats.statusCounts).find(
                    (s: any) => s.status === "PENDING"
                  )?.count || 0}
                </div>
              </CardContent>
            </Card>
          }
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">
                Invoice Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col">
              <div className="text-lg font-bold text-gray-800">Available</div>
              <Button variant="outline" size="sm" className="mt-2">
                <Link href="/admin/orders/export-invoices">
                  Export All Invoices
                </Link>
              </Button>
            </CardContent>
          </Card>
        </FeatureGuard>
      </div>

      {/* Filters */}
      <OrderFilters currentFilters={currentFilters} />

      {/* Orders Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-gray-700 w-[180px]">Order</TableHead>
              <TableHead className="text-gray-700">Customer</TableHead>
              <TableHead className="text-gray-700">Items</TableHead>
              <TableHead className="text-gray-700">Date</TableHead>
              <TableHead className="text-gray-700">Total</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-gray-700">Payment</TableHead>
              <TableHead className="text-right text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-gray-600"
                >
                  No orders found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-gray-800">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      {order.orderNumber}
                    </Link>
                    <div className="text-xs text-gray-400 mt-1">
                      {order._count.items} items
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${order.userId}`}
                      className="text-gray-200 hover:text-indigo-600 hover:underline font-medium"
                    >
                      {order.user.name || "Unnamed Customer"}
                    </Link>
                    <div className="text-xs text-gray-400 truncate">
                      {order.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div
                          key={i}
                          className="text-sm text-gray-200 flex items-center"
                        >
                          <span className="w-6 text-gray-200">
                            {item.quantity}×
                          </span>
                          <Link
                            href={`/admin/products/${item.productId}`}
                            className="truncate hover:underline max-w-[150px]"
                          >
                            {item.productName ||
                              item.product?.name ||
                              "Product"}
                          </Link>
                        </div>
                      ))}
                      {order._count.items > 3 && (
                        <div className="text-xs text-gray-400">
                          +{order._count.items - 3} more items
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-200">
                      {formatDate(order.createdAt)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(order.total)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge
                      status={order.paymentStatus}
                      type="payment"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <OrderListActions
                      orderId={order.id}
                      hasInvoice={!!order.invoice}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalOrders}
      />
    </div>
  );
}
