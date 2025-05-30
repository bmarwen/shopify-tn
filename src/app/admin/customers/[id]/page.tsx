// src/app/admin/customers/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/table";
import { ArrowLeft, Edit, Mail, Phone, MapPin, ShoppingBag, Calendar } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/currency";
import CustomerActions from "@/components/admin/customers/customer-actions";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CustomerDetailPage({ params }: PageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/customers");
  }

  const shopId = session.user.shopId;
  const customerId = params.id;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get customer details
  const customer = await db.user.findFirst({
    where: {
      id: customerId,
      shopId,
      role: "CUSTOMER",
    },
    include: {
      addresses: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          paymentStatus: true,
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  // Calculate total spent
  const totalSpentResult = await db.order.aggregate({
    where: {
      userId: customerId,
      shopId,
      paymentStatus: "COMPLETED",
    },
    _sum: {
      total: true,
    },
  });

  const totalSpent = totalSpentResult._sum.total || 0;

  // Get default address
  const defaultAddress = customer.addresses.find(addr => addr.isDefault) || customer.addresses[0];

  // Format dates for display
  const formatDateForDisplay = (date: Date | string) => {
    return formatDate(date, 'fr-FR');
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      SHIPPED: "bg-blue-100 text-blue-800",
      DELIVERED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
      REFUNDED: "bg-purple-100 text-purple-800",
      RETURNED: "bg-orange-100 text-orange-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      COMPLETED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
      REFUNDED: "bg-purple-100 text-purple-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-800">
              {customer.name}
            </h1>
            <p className="text-gray-500">
              Customer since {formatDateForDisplay(customer.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link href={`/admin/customers/${customerId}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Customer
            </Button>
          </Link>
          <CustomerActions customerId={customerId} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{customer.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900">
                    {defaultAddress?.phone || "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          {defaultAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-gray-900">{defaultAddress.line1}</p>
                  {defaultAddress.line2 && (
                    <p className="text-gray-900">{defaultAddress.line2}</p>
                  )}
                  <p className="text-gray-900">
                    {defaultAddress.city}, {defaultAddress.state} {defaultAddress.postalCode}
                  </p>
                  <p className="text-gray-900">{defaultAddress.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Recent Orders
              </CardTitle>
              <CardDescription>
                Latest orders from this customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No orders yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-medium text-indigo-600 hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getStatusColor(order.status)
                              }`}
                            >
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getPaymentStatusColor(order.paymentStatus)
                              }`}
                            >
                              {order.paymentStatus}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {formatCurrency(order.total, shopSettings.currency)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {formatDateForDisplay(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {customer._count.orders > 10 && (
                <div className="mt-4 text-center">
                  <Link
                    href={`/admin/orders?customer=${customerId}`}
                    className="text-indigo-600 hover:underline text-sm"
                  >
                    View all {customer._count.orders} orders →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Total Orders</span>
                </div>
                <span className="font-semibold">{customer._count.orders}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Total Spent</span>
                </div>
                <span className="font-semibold text-green-600">
                  {formatCurrency(totalSpent, shopSettings.currency)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Member Since</span>
                </div>
                <span className="text-sm">
                  {formatDateForDisplay(customer.createdAt)}
                </span>
              </div>

              {customer._count.orders > 0 && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-600">Average Order</span>
                  <span className="font-semibold">
                    {formatCurrency(totalSpent / customer._count.orders, shopSettings.currency)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/admin/customers/${customerId}/edit`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Customer
                </Button>
              </Link>
              
              <Link href={`/admin/orders?customer=${customerId}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  View All Orders
                </Button>
              </Link>
              
              <Link href={`mailto:${customer.email}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
