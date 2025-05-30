import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ordersService } from "@/lib/services/orders.service";
import { formatCurrency, formatDate, getImageUrl } from "@/lib/utils";
import { FeatureGuard } from "@/components/authorization/feature-guard";
import { Feature } from "@/lib/feature-authorization";
import OrderItemImage from "@/components/admin/order-item-image";

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
  Receipt,
  DollarSign,
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
              <Button variant="outline">
                <Link href={`/api/orders/${order.id}/invoice`} target="_blank">
                  <FileText className="h-4 w-4 mr-2" />
                  View Invoice
                </Link>
              </Button>
            ) : (
              <Button>
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
                          <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                            {item.productImage ? (
                              <OrderItemImage
                                src={getImageUrl(item.productImage)}
                                alt={item.productName}
                                width={40}
                                height={40}
                                className="object-cover object-center w-full h-full"
                              />
                            ) : (
                              <div className="text-gray-400 text-xs flex items-center justify-center w-full h-full">
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
                    <span className="text-gray-700">Shipping Address</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 bg-gray-900">
                <div className="space-y-1 text-gray-200">
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
                  <span className="text-gray-700">Payment Details</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-gray-900">
              <div className="space-y-4">
                {/* Payment Status */}
                <div className="flex justify-between">
                  <span className="text-gray-200">Payment Status</span>
                  <OrderStatusBadge
                    status={order.paymentStatus}
                    type="payment"
                  />
                </div>
                
                {/* Payment Methods Used */}
                {order.orderPayments && order.orderPayments.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Payment Methods ({order.orderPayments.length})
                    </h4>
                    <div className="space-y-3">
                      {order.orderPayments.map((payment, index) => (
                        <div key={payment.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {payment.paymentMethod === 'CASH' && <Banknote className="h-4 w-4 text-green-500" />}
                              {payment.paymentMethod === 'CREDIT_CARD' && <CreditCard className="h-4 w-4 text-blue-500" />}
                              {payment.paymentMethod === 'CHECK' && <Receipt className="h-4 w-4 text-purple-500" />}
                              <span className="text-gray-200 font-medium">
                                {payment.paymentMethod.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-gray-100 font-bold">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                          
                          {/* Cash Payment Details */}
                          {payment.paymentMethod === 'CASH' && payment.cashGiven && (
                            <div className="text-xs text-gray-400 space-y-1">
                              <div className="flex justify-between">
                                <span>Cash Given:</span>
                                <span>{formatCurrency(payment.cashGiven)}</span>
                              </div>
                              {payment.cashChange && payment.cashChange > 0 && (
                                <div className="flex justify-between">
                                  <span>Change Returned:</span>
                                  <span>{formatCurrency(payment.cashChange)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Check Payment Details */}
                          {payment.paymentMethod === 'CHECK' && (
                            <div className="text-xs text-gray-400 space-y-1">
                              {payment.checkNumber && (
                                <div className="flex justify-between">
                                  <span>Check Number:</span>
                                  <span className="font-mono">{payment.checkNumber}</span>
                                </div>
                              )}
                              {payment.checkBankName && (
                                <div className="flex justify-between">
                                  <span>Bank:</span>
                                  <span>{payment.checkBankName}</span>
                                </div>
                              )}
                              {payment.checkDate && (
                                <div className="flex justify-between">
                                  <span>Check Date:</span>
                                  <span>{formatDate(payment.checkDate)}</span>
                                </div>
                              )}
                              {payment.checkStatus && (
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className={`capitalize ${
                                    payment.checkStatus === 'CLEARED' ? 'text-green-400' :
                                    payment.checkStatus === 'BOUNCED' ? 'text-red-400' :
                                    payment.checkStatus === 'DEPOSITED' ? 'text-blue-400' :
                                    'text-yellow-400'
                                  }`}>
                                    {payment.checkStatus.toLowerCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Payment Notes */}
                          {payment.notes && (
                            <div className="text-xs text-gray-400 mt-2">
                              <span className="font-medium">Notes:</span> {payment.notes}
                            </div>
                          )}
                          
                          {/* Transaction ID */}
                          {payment.transactionId && (
                            <div className="text-xs text-gray-400 mt-1">
                              <span className="font-medium">Transaction ID:</span>
                              <span className="font-mono ml-1">{payment.transactionId}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Legacy Payment Info */
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-200">Payment Method</span>
                      <span className="text-gray-300 font-medium">
                        {order.paymentMethodType?.replace('_', ' ') || "Standard Payment"}
                      </span>
                    </div>
                    
                    {/* Cash Payment Legacy */}
                    {order.paymentMethodType === 'CASH' && (
                      <div className="space-y-1 text-xs text-gray-400">
                        {order.cashAmountGiven && (
                          <div className="flex justify-between">
                            <span>Cash Given:</span>
                            <span>{formatCurrency(order.cashAmountGiven)}</span>
                          </div>
                        )}
                        {order.cashAmountChange && order.cashAmountChange > 0 && (
                          <div className="flex justify-between">
                            <span>Change Returned:</span>
                            <span>{formatCurrency(order.cashAmountChange)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Check Payments (Legacy) */}
                {order.checkPayments && order.checkPayments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-200 mb-3 flex items-center">
                      <Receipt className="h-4 w-4 mr-1" />
                      Check Payments ({order.checkPayments.length})
                    </h4>
                    <div className="space-y-2">
                      {order.checkPayments.map((check, index) => (
                        <div key={check.id} className="p-2 bg-gray-800 rounded border border-gray-700">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-200 font-medium">Check #{check.checkNumber}</span>
                            <span className="text-gray-100 font-bold">{formatCurrency(check.amount)}</span>
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            {check.bankName && (
                              <div>Bank: {check.bankName}</div>
                            )}
                            <div>Date: {formatDate(check.checkDate)}</div>
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <span className={`capitalize ${
                                check.status === 'CLEARED' ? 'text-green-400' :
                                check.status === 'BOUNCED' ? 'text-red-400' :
                                check.status === 'DEPOSITED' ? 'text-blue-400' :
                                'text-yellow-400'
                              }`}>
                                {check.status.toLowerCase()}
                              </span>
                            </div>
                            {check.notes && (
                              <div>Notes: {check.notes}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
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
                    <Button size="sm" className="w-full mt-2">
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
                    <Button size="sm" className="w-full">
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
