// src/app/admin/discounts/page.tsx
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
import DiscountListActions from "@/components/admin/discount-list-actions";
import Pagination from "@/components/admin/pagination";

interface DiscountsPageProps {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

export default async function DiscountsPage({
  searchParams,
}: DiscountsPageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discounts");
  }
  const shopId = session.user.shopId;

  // Parse pagination params safely
  const page = parseInt(String(searchParams.page) || "1");
  const perPage = parseInt(String(searchParams.perPage) || "10");
  const productId = searchParams.product
    ? String(searchParams.product)
    : undefined;

  // Build where clause for filtering
  const where: any = {
    product: {
      shopId,
    },
  };

  // Filter by specific product if requested
  if (productId) {
    where.productId = productId;
  }

  // Count total discounts for pagination
  const totalDiscounts = await db.discount.count({
    where,
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalDiscounts / perPage);

  // Get discounts with pagination
  const discounts = await db.discount.findMany({
    where,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  // Get product info if filtering by product
  let productInfo = null;
  if (productId) {
    productInfo = await db.product.findUnique({
      where: {
        id: productId,
        shopId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  // Format dates for display
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  // Calculate the price after discount
  const getDiscountedPrice = (price: number, discountPercentage: number) => {
    const discount = (price * discountPercentage) / 100;
    return (price - discount).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            {productInfo
              ? `Discounts for ${productInfo.name}`
              : "All Discounts"}
          </h1>
          {productInfo && (
            <p className="text-gray-500">
              <Link
                href="/admin/discounts"
                className="text-indigo-600 hover:underline"
              >
                Back to all discounts
              </Link>
            </p>
          )}
        </div>
        <Link href="/admin/discounts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Discount
          </Button>
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-gray-700">Product</TableHead>
              <TableHead className="text-gray-700">Percentage</TableHead>
              <TableHead className="text-gray-700">Original Price</TableHead>
              <TableHead className="text-gray-700">Discounted Price</TableHead>
              <TableHead className="text-gray-700">Valid Period</TableHead>
              <TableHead className="text-gray-700">Status</TableHead>
              <TableHead className="text-right text-gray-700">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-600"
                >
                  No discounts found.{" "}
                  <Link
                    href="/admin/discounts/new"
                    className="text-indigo-600 hover:underline"
                  >
                    Add your first discount
                  </Link>
                  .
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <Link
                      href={`/admin/products/${discount.product.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {discount.product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    {discount.percentage}%
                  </TableCell>
                  <TableCell>${discount.product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-green-600">
                    $
                    {getDiscountedPrice(
                      discount.product.price,
                      discount.percentage
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDate(discount.startDate)} to{" "}
                    {formatDate(discount.endDate)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        discount.enabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {discount.enabled ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DiscountListActions discountId={discount.id} />
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
        totalItems={totalDiscounts}
      />
    </div>
  );
}
