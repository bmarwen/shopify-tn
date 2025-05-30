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
import { formatDate } from "@/lib/utils/currency";
import DiscountCodeActions from "@/components/admin/discount-codes/discount-code-actions";
import SimpleS3Image from "@/components/ui/image-upload/simple-s3-image";

export default async function DiscountCodesPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discount-codes");
  }
  const shopId = session.user.shopId;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get discount codes (exclude soft deleted)
  const discountCodes = await db.discountCode.findMany({
    where: { 
      shopId,
      isDeleted: false // Only show non-deleted codes
    },
    include: {
      products: {
        select: { id: true, name: true },
        take: 3, // Limit to first 3 products for display
      },
      variants: {
        select: { 
          id: true, 
          name: true,
          product: {
            select: { id: true, name: true }
          }
        },
        take: 3, // Limit to first 3 variants for display
      },
      category: {
        select: { id: true, name: true },
      },
      users: {
        select: { id: true, name: true, email: true },
        take: 1, // Only show first user for display
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format dates for display
  const formatDateForDisplay = (date: Date | string) => {
    return formatDate(date, 'fr-FR');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Discount Codes
          </h1>
          <p className="text-gray-500">
            Manage coupon codes and promotional offers
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
              <TableHead className="text-gray-700">Image</TableHead>
              <TableHead className="text-gray-700">Code</TableHead>
              <TableHead className="text-gray-700">Percentage</TableHead>
              <TableHead className="text-gray-700">Targeting</TableHead>
              <TableHead className="text-gray-700">Usage</TableHead>
              <TableHead className="text-gray-700">Valid Period</TableHead>
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
                  colSpan={8}
                  className="text-center py-8 text-gray-600"
                >
                  No discount codes found.{" "}
                  <Link
                    href="/admin/discount-codes/new"
                    className="text-indigo-600 hover:underline"
                  >
                    Create your first discount code
                  </Link>
                  .
                </TableCell>
              </TableRow>
            ) : (
              discountCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                      {code.image ? (
                        <SimpleS3Image
                          src={code.image}
                          alt={code.title || code.code}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                          <span className="text-purple-600 font-bold text-xs">
                            {code.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono font-medium text-indigo-600">
                        {code.code}
                      </span>
                      {code.title && (
                        <span className="text-sm text-gray-500">
                          {code.title}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {code.percentage}%
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      {code.category && (
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full w-fit">
                          Category: {code.category.name}
                        </span>
                      )}
                      {code.products.length > 0 && (
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full w-fit">
                          {code.products.length} Product{code.products.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {code.variants.length > 0 && (
                        <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full w-fit">
                          {code.variants.length} Variant{code.variants.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {code.users.length > 0 && (
                        <span className="text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded-full w-fit">
                          User: {code.users[0].name}
                        </span>
                      )}
                      {!code.category && code.products.length === 0 && code.variants.length === 0 && code.users.length === 0 && (
                        <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded-full w-fit">
                          All Products
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {code.usedCount || 0}{code.usageLimit ? `/${code.usageLimit}` : ''} uses
                      </span>
                      {code.usageLimit && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ 
                              width: `${Math.min(((code.usedCount || 0) / code.usageLimit) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDateForDisplay(code.startDate)} to{" "}
                    {formatDateForDisplay(code.endDate)}
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
                    <DiscountCodeActions 
                      codeId={code.id} 
                      usedCount={code.usedCount}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
