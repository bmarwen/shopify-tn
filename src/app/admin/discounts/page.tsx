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
import { formatDate } from "@/lib/utils/currency";
import SimpleS3Image from "@/components/ui/image-upload/simple-s3-image";

export default async function DiscountsPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.shopId) {
    redirect("/login?callbackUrl=/admin/discounts");
  }
  const shopId = session.user.shopId;

  // Get shop settings for currency
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { currency: true },
  }) || { currency: 'DT' };

  // Get discounts with enhanced relations (exclude soft deleted)
  const discounts = await db.discount.findMany({
    where: {
      isDeleted: false, // Only show non-deleted discounts
      OR: [
        // Legacy single product/variant discounts
        {
          product: { shopId },
        },
        {
          variant: {
            product: { shopId }
          }
        },
        // Multi-targeting discounts (products)
        {
          products: {
            some: {
              shopId: shopId
            }
          }
        },
        // Multi-targeting discounts (variants)
        {
          variants: {
            some: {
              product: {
                shopId: shopId
              }
            }
          }
        },
        // Category targeting
        {
          category: {
            shopId: shopId
          }
        },
        // Global discounts (targeting all products)
        {
          AND: [
            { productId: null },
            { variantId: null },
            { categoryId: null },
            { products: { none: {} } },
            { variants: { none: {} } }
          ]
        }
      ]
    },
    include: {
      // Legacy relations
      product: {
        select: { 
          id: true, 
          name: true, 
          images: true,
        },
      },
      variant: {
        select: {
          id: true,
          name: true,
          product: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      // Multi-targeting relations
      products: {
        select: { id: true, name: true },
        take: 3, // Limit for display
      },
      variants: {
        select: { 
          id: true, 
          name: true, 
          product: {
            select: { id: true, name: true }
          }
        },
        take: 3, // Limit for display
      },
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format dates for display
  const formatDateForDisplay = (date: Date | string) => {
    return formatDate(date, 'fr-FR');
  };

  // Helper to get discount target description
  const getTargetDescription = (discount: any) => {
    if (discount.product) {
      return `Single: ${discount.product.name}`;
    }
    if (discount.variant) {
      return `Variant: ${discount.variant.product.name} - ${discount.variant.name}`;
    }
    if (discount.category) {
      return `Category: ${discount.category.name}`;
    }
    if (discount.products && discount.products.length > 0) {
      const moreCount = discount.products.length > 3 ? ` +${discount.products.length - 3} more` : '';
      return `Products: ${discount.products.slice(0, 3).map((p: any) => p.name).join(', ')}${moreCount}`;
    }
    if (discount.variants && discount.variants.length > 0) {
      const moreCount = discount.variants.length > 3 ? ` +${discount.variants.length - 3} more` : '';
      return `Variants: ${discount.variants.slice(0, 3).map((v: any) => `${v.product.name} - ${v.name}`).join(', ')}${moreCount}`;
    }
    return "All Products";
  };

  // Helper to get target badges
  const getTargetBadges = (discount: any) => {
    const badges = [];
    
    if (discount.category) {
      badges.push(
        <span key="category" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Category: {discount.category.name}
        </span>
      );
    }
    
    if (discount.products && discount.products.length > 0) {
      badges.push(
        <span key="products" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {discount.products.length} Product{discount.products.length > 1 ? 's' : ''}
        </span>
      );
    }
    
    if (discount.variants && discount.variants.length > 0) {
      badges.push(
        <span key="variants" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {discount.variants.length} Variant{discount.variants.length > 1 ? 's' : ''}
        </span>
      );
    }
    
    if (discount.product) {
      badges.push(
        <span key="single" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Single Product
        </span>
      );
    }
    
    if (discount.variant) {
      badges.push(
        <span key="variant" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Single Variant
        </span>
      );
    }
    
    if (!discount.category && (!discount.products || discount.products.length === 0) && 
        (!discount.variants || discount.variants.length === 0) && !discount.product && !discount.variant) {
      badges.push(
        <span key="all" className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          All Products
        </span>
      );
    }
    
    return badges;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Discounts
          </h1>
          <p className="text-gray-500">
            Manage product discounts and promotional offers
          </p>
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
              <TableHead className="text-gray-700">Image</TableHead>
              <TableHead className="text-gray-700">Title/Target</TableHead>
              <TableHead className="text-gray-700">Percentage</TableHead>
              <TableHead className="text-gray-700">Targeting</TableHead>
              <TableHead className="text-gray-700">Valid Period</TableHead>
              <TableHead className="text-gray-700">Availability</TableHead>
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
                  colSpan={8}
                  className="text-center py-8 text-gray-600"
                >
                  No discounts found.{" "}
                  <Link
                    href="/admin/discounts/new"
                    className="text-indigo-600 hover:underline"
                  >
                    Create your first discount
                  </Link>
                  .
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                      {discount.image ? (
                        <SimpleS3Image
                          src={discount.image}
                          alt={discount.title || "Discount"}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                          <span className="text-green-600 font-bold text-xs">
                            {discount.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {discount.title || "Discount"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getTargetDescription(discount)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {discount.percentage}%
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getTargetBadges(discount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDateForDisplay(discount.startDate)} to{" "}
                    {formatDateForDisplay(discount.endDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {discount.availableOnline && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Online
                        </span>
                      )}
                      {discount.availableInStore && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          In-Store
                        </span>
                      )}
                    </div>
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
    </div>
  );
}
