// src/app/admin/orders/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ordersService } from "@/lib/services/orders.service";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FeatureGuard } from "@/components/authorization/feature-guard";
import { Feature } from "@/lib/feature-authorization";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import OrderStatusBadge from "@/components/admin/order-status-badge";
import OrderStatusUpdateForm from "@/components/admin/order-status-update-form";
import {
  Truck,
  CreditCard,
  User,
  ShoppingBag,
  Banknote,
  FileText,
  ArrowLeft,
  NotebookPen,
  PackageCheck,
  Notebook,
  BookOpenText,
} from "lucide-react";

interface OrderDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/orders");
  }

  const shopId = session.user.shopId;
  const orderId = params.id;

  // Get the order
  const order = await ordersService.getOrderById(orderId, shopId);

  if (!order) {
    notFound();
  }

  // Calculate summary values
  const totalItems = order.items.length;
  const totalQuantity = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link
            href="/admin/orders"
            className="flex items-center text-gray-600 hover:text-indigo-600 text-sm mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to all orders
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Order {order.orderNumber}
          </h1>
          <p className="text-gray-500 mt-1">
            Placed on {formatDate(order.createdAt)} at{" "}
            {new Date(order.createdAt).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <FeatureGuard feature={Feature.INVOICE_GENERATION}>
            {order.invoice ? (
              <Button asChild variant="outline">
                <Link href={`/api/orders/${order.id}/invoice`} target="_blank">
                  <FileText className="h-4 w-4 mr-2" />
                  View Invoice
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={`/api/orders/${order.id}/invoice/generate`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Link>
              </Button>
            )}
          </FeatureGuard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main order details */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Items Card */}
          <Card>
            <CardHeader className="bg-gray-50 border-b rounded-t-md">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-gray-800">
                  <ShoppingBag className="h-4 w-4 inline-block mr-2 text-gray-600" />
                  <span className="text-gray-700">
                    Order Items ({totalItems})
                  </span>
                </CardTitle>
                <div className="text-md text-gray-700">
                  Total Quantity:{" "}
                  <span className="font-semibold">{totalQuantity}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 bg-gray-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                            {item.productImage ? (
                              <Image
                                src={item.productImage}
                                alt={item.productName}
                                width={40}
                                height={40}
                                className="object-cover"
                              />
                            ) : (
                              <div className="text-gray-400 text-xs">
                                No image
                              </div>
                            )}
                          </div>
                          <div>
                            <Link
                              href={`/admin/products/${item.productId}`}
                              className="font-medium text-gray-800 hover:text-indigo-600 hover:underline"
                            >
                              {item.productName}
                            </Link>
                            {item.productOptions &&
                              Object.keys(item.productOptions).length > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {Object.entries(item.productOptions)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(", ")}
                                </div>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {formatCurrency(item.unitPrice)}
                        {item.discountPercentage && (
                          <div className="text-xs text-green-600">
                            ({item.discountPercentage}% off)
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-800">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.subtotal)}
                    </TableCell>
                  </TableRow>
                  {order.shipping > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Shipping
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.shipping)}
                      </TableCell>
                    </TableRow>
                  )}
                  {order.tax > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        Tax
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.tax)}
                      </TableCell>
                    </TableRow>
                  )}
                  {order.discount > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-right font-medium text-green-600"
                      >
                        Discount
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        -{formatCurrency(order.discount)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-right font-bold text-lg"
                    >
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      {formatCurrency(order.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Order Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="bg-gray-50 border-b rounded-t-md">
                <CardTitle className="text-lg text-gray-800">
                  <NotebookPen className="h-4 w-4 inline-block mr-2 text-gray-600" />
                  <span className="text-gray-700">Order Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 bg-gray-900">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {order.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Order Status Update Form */}
          <Card>
            <CardHeader className="bg-gray-50 border-b rounded-t-md">
              <CardTitle className="text-lg text-gray-800">
                <PackageCheck className="h-4 w-4 inline-block mr-2 text-gray-600" />
                <span className="text-gray-700">Update Order Status</span>
              </CardTitle>
              <CardDescription>Change the status of this order</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-6 bg-gray-900">
              <OrderStatusUpdateForm
                orderId={order.id}
                currentStatus={order.status}
                currentPaymentStatus={order.paymentStatus}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Customer, Shipping, Payment info */}
        <div className="space-y-6">
          {/* Order Summary Card */}
          <Card>
            <CardHeader className="bg-gray-50 border-b rounded-t-md">
              <CardTitle className="text-lg text-gray-800">
                <BookOpenText className="h-4 w-4 inline-block mr-2 text-gray-600" />
                <span className="text-gray-700">Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-gray-200 bg-gray-900">
              <div className="py-3 flex justify-between ">
                <span className="text-gray-200">Status</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-gray-200">Payment</span>
                <OrderStatusBadge status={order.paymentStatus} type="payment" />
              </div>

              <div className="py-3 flex justify-between">
                <span className="text-gray-200">Date Placed</span>
                <span className="text-gray-300">
                  {formatDate(order.createdAt)}
                </span>
              </div>
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <div className="py-3 flex justify-between">
                  <span className="text-gray-200">Last Updated</span>
                  <span className="text-gray-300">
                    {formatDate(order.updatedAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader className="bg-gray-50 border-b px-4 py-3 rounded-t-md">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                <CardTitle className="text-base text-gray-800">
                  <span className="text-gray-700">Customer</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-gray-900">
              <div className="space-y-2">
                <div className="font-medium text-gray-200">
                  {order.user.name || "Guest Customer"}
                </div>
                <div className="text-gray-400">{order.user.email}</div>
                <div className="pt-2">
                  <Button variant="outline" size="sm">
                    <Link href={`/admin/customers/${order.userId}`}>
                      View Customer
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.address && (
            <Card>
              <CardHeader className="bg-gray-50 border-b px-4 py-3 rounded-t-md">
                <div className="flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-gray-500" />
                  <CardTitle className="text-base text-gray-800">
                    <span className="text-gray-200">Shipping Address</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 bg-gray-900">
                <div className="space-y-1 text-gray-400">
                  <div>{order.address.line1}</div>
                  {order.address.line2 && <div>{order.address.line2}</div>}
                  <div>
                    {order.address.city}, {order.address.state}{" "}
                    {order.address.postalCode}
                  </div>
                  <div>{order.address.country}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Info */}
          <Card>
            <CardHeader className="bg-gray-50 border-b px-4 py-3 rounded-t-md">
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                <CardTitle className="text-base text-gray-800">
                  <span className="text-gray-700">Payment Info</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-gray-900">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-200">Payment Method</span>
                  <span className="text-gray-300 font-medium">
                    {order.paymentMethodType || "Standard Payment"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-200">Payment Status</span>
                  <OrderStatusBadge
                    status={order.paymentStatus}
                    type="payment"
                  />
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span className="text-gray-200">Total Paid</span>
                  <span className="text-gray-300">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Status - Only for Advanced/Premium plans */}
          <FeatureGuard feature={Feature.INVOICE_GENERATION}>
            <Card>
              <CardHeader className="bg-gray-50 border-b px-4 py-3 rounded-t-md">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  <CardTitle className="text-base text-gray-800">
                    <span className="text-gray-700">Invoice</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 bg-gray-900">
                {order.invoice ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number</span>
                      <span className="text-gray-800 font-medium">
                        {order.invoice.invoiceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created On</span>
                      <span className="text-gray-800">
                        {formatDate(order.invoice.createdAt)}
                      </span>
                    </div>
                    <Button size="sm" className="w-full mt-2" asChild>
                      <Link
                        href={`/api/orders/${order.id}/invoice`}
                        target="_blank"
                      >
                        View Invoice
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-gray-600 mb-3">
                      No invoice generated yet
                    </p>
                    <Button size="sm" className="w-full" asChild>
                      <Link href={`/api/orders/${order.id}/invoice/generate`}>
                        Generate Invoice
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </FeatureGuard>
        </div>
      </div>
    </div>
  );
}
