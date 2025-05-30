// src/app/admin/customers/page.tsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Plus, Search, Filter } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils/currency";
import CustomerActions from "@/components/admin/customers/customer-actions";
import CustomerFilters from "@/components/admin/customers/customer-filters";

interface PageProps {
  searchParams: {
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  };
}

export default async function CustomersPage({ searchParams }: PageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/customers");
  }
  const shopId = session.user.shopId;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get query parameters
  const search = searchParams.search || "";
  const sortBy = searchParams.sortBy || "createdAt";
  const sortOrder = searchParams.sortOrder || "desc";
  const page = parseInt(searchParams.page || "1");
  const limit = 15;
  const skip = (page - 1) * limit;

  // Build where clause
  const whereClause: any = {
    shopId,
    role: "CUSTOMER",
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      {
        addresses: {
          some: {
            phone: { contains: search, mode: "insensitive" }
          }
        }
      }
    ];
  }

  // Build orderBy clause
  const orderBy: any = {};
  if (sortBy === "name" || sortBy === "email" || sortBy === "createdAt") {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.createdAt = "desc";
  }

  // Get customers with pagination
  const [customers, total] = await Promise.all([
    db.user.findMany({
      where: whereClause,
      include: {
        addresses: {
          where: { isDefault: true },
          take: 1,
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    db.user.count({ where: whereClause })
  ]);

  // Get total spent for each customer (in parallel for performance)
  const customerTotals = await Promise.all(
    customers.map(async (customer) => {
      const totalSpent = await db.order.aggregate({
        where: {
          userId: customer.id,
          shopId,
          paymentStatus: "COMPLETED",
        },
        _sum: {
          total: true,
        },
      });
      return {
        customerId: customer.id,
        totalSpent: totalSpent._sum.total || 0,
      };
    })
  );

  // Merge total spent data
  const formattedCustomers = customers.map((customer) => {
    const totalData = customerTotals.find(t => t.customerId === customer.id);
    return {
      id: customer.id,
      name: customer.name || "Unknown Customer",
      email: customer.email,
      phone: customer.addresses[0]?.phone || null,
      address: customer.addresses[0] ? {
        line1: customer.addresses[0].line1,
        line2: customer.addresses[0].line2,
        city: customer.addresses[0].city,
        state: customer.addresses[0].state,
        postalCode: customer.addresses[0].postalCode,
        country: customer.addresses[0].country,
      } : null,
      orderCount: customer._count.orders,
      totalSpent: totalData?.totalSpent || 0,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  });

  const totalPages = Math.ceil(total / limit);

  // Format dates for display
  const formatDateForDisplay = (date: Date | string) => {
    return formatDate(date, 'fr-FR');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Customers
          </h1>
          <p className="text-gray-500">
            Manage your customer database and information
          </p>
        </div>
        <Link href="/admin/customers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <CustomerFilters 
        currentSearch={search}
        currentSortBy={sortBy}
        currentSortOrder={sortOrder}
        totalCustomers={total}
      />

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-gray-700">Customer</TableHead>
                <TableHead className="text-gray-700">Contact</TableHead>
                <TableHead className="text-gray-700">Location</TableHead>
                <TableHead className="text-gray-700">Orders</TableHead>
                <TableHead className="text-gray-700">Total Spent</TableHead>
                <TableHead className="text-gray-700">Joined</TableHead>
                <TableHead className="text-right text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formattedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-gray-600"
                  >
                    {search ? (
                      <>
                        No customers found matching "{search}".{" "}
                        <Link
                          href="/admin/customers"
                          className="text-indigo-600 hover:underline"
                        >
                          Clear search
                        </Link>
                      </>
                    ) : (
                      <>
                        No customers found.{" "}
                        <Link
                          href="/admin/customers/new"
                          className="text-indigo-600 hover:underline"
                        >
                          Add your first customer
                        </Link>
                        .
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                formattedCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <span className="text-sm text-gray-500">
                          {customer.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.phone ? (
                        <span className="text-gray-900">{customer.phone}</span>
                      ) : (
                        <span className="text-gray-400 italic">No phone</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="text-sm">
                          <div className="text-gray-900">
                            {customer.address.city}
                            {customer.address.state && `, ${customer.address.state}`}
                          </div>
                          <div className="text-gray-500">
                            {customer.address.country}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No address</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">
                          {customer.orderCount}
                        </span>
                        <span className="text-sm text-gray-500">
                          {customer.orderCount === 1 ? "order" : "orders"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">
                        {formatCurrency(customer.totalSpent, shopSettings.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">
                        {formatDateForDisplay(customer.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <CustomerActions customerId={customer.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Showing {skip + 1} to {Math.min(skip + limit, total)} of {total} customers
            </div>
            <div className="flex space-x-2">
              {page > 1 && (
                <Link
                  href={`/admin/customers?${new URLSearchParams({
                    ...searchParams,
                    page: (page - 1).toString(),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/customers?${new URLSearchParams({
                    ...searchParams,
                    page: (page + 1).toString(),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
