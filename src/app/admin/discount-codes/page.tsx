// src/app/admin/discount-codes/page.tsx
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
import { Plus } from "lucide-react";
import DiscountCodeListActions from "@/components/admin/discount-code-list-actions";
import Pagination from "@/components/admin/pagination";

interface DiscountCodesPageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

export default async function DiscountCodesPage({
  searchParams,
}: DiscountCodesPageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discount-codes");
  }
  const shopId = session.user.shopId;

  // Parse pagination params safely
  const page = parseInt(String(searchParams.page) || "1");
  const perPage = parseInt(String(searchParams.perPage) || "10");
  const productId = searchParams.product
    ? String(searchParams.product)
    : undefined;
  const userId = searchParams.user ? String(searchParams.user) : undefined;

  // Build where clause for filtering
  const where: any = { shopId };

  // Filter by specific product if requested
  if (productId) {
    where.productId = productId;
  }

  // Filter by specific user if requested
  if (userId) {
    where.userId = userId;
  }

  // Count total discount codes for pagination
  const totalDiscountCodes = await db.discountCode.count({
    where,
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalDiscountCodes / perPage);

  // Get discount codes with pagination
  const discountCodes = await db.discountCode.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  // Format dates for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Discount Codes
          </h1>
          <p className="text-gray-500 mt-1">
            Manage promotional codes for your customers
          </p>
        </div>
        <Link href="/admin/discount-codes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Discount Code
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-gray-700">Code</TableHead>
              <TableHead className="text-gray-700">Discount</TableHead>
              <TableHead className="text-gray-700">Valid Period</TableHead>
              <TableHead className="text-gray-700">Applied To</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-right text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discountCodes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-gray-600"
                >
                  No discount codes found.{" "}
                  <Link
                    href="/admin/discount-codes/new"
                    className="text-indigo-600 hover:underline"
                  >
                    Add your first discount code
                  </Link>
                  .
                </TableCell>
              </TableRow>
            ) : (
              discountCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-medium uppercase">
                    {code.code}
                  </TableCell>
                  <TableCell>{code.percentage}% OFF</TableCell>
                  <TableCell>
                    {formatDate(code.startDate)} to {formatDate(code.endDate)}
                  </TableCell>
                  <TableCell>
                    {code.product ? (
                      <Link
                        href={`/admin/products/${code.product.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {code.product.name}
                      </Link>
                    ) : (
                      <span>All Products</span>
                    )}
                    <br />
                    {code.user ? (
                      <Link
                        href={`/admin/customers/${code.user.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {code.user.name || code.user.email}
                      </Link>
                    ) : (
                      <span>All Users</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        code.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {code.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DiscountCodeListActions discountCodeId={code.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination using client component */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalDiscountCodes}
      />
    </div>
  );
}
