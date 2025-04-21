// src/app/admin/products/page.tsx
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Image from "next/image";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  LayoutGrid,
  List,
  SlidersHorizontal,
  FileDown,
  FilePlus,
  Tag,
  ShoppingBag,
} from "lucide-react";
import ProductListActions from "@/components/admin/product-list-actions";
import ProductPagination from "@/components/admin/product-pagination";
import ProductFilters from "@/components/admin/product-filters";
import { Badge } from "@/components/ui/badge";

interface ProductsPageProps {
  searchParams: {
    page?: string;
    perPage?: string;
    sort?: string;
    order?: string;
    search?: string;
    category?: string;
    inStock?: string;
    lowStock?: string;
    view?: string; // 'list' or 'grid'
  };
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    return <div className="text-gray-800">Shop not found</div>;
  }

  const shopId = session.user.shopId;

  // View options - list or grid
  const viewMode = searchParams.view || "list";

  // Parse query parameters
  const page = parseInt(searchParams.page || "1");
  const perPage = parseInt(searchParams.perPage || "10");
  const sort = searchParams.sort || "createdAt";
  const order = searchParams.order || "desc";
  const search = searchParams.search || "";
  const categoryId = searchParams.category || "";
  const inStock = searchParams.inStock === "true";
  const lowStock = searchParams.lowStock === "true";

  // Get shop settings to find the low stock threshold
  const shopSettings = await db.shopSettings.findUnique({
    where: { shopId },
    select: { lowStockThreshold: true },
  });

  const lowStockThreshold = shopSettings?.lowStockThreshold || 5; // Default to 5 if not set

  // Build filters
  const filters: any = { shopId };

  if (search) {
    filters.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ];
  }

  if (categoryId) {
    filters.categories = {
      some: { id: categoryId },
    };
  }

  if (inStock) {
    filters.inventory = { gt: 0 };
  }

  if (lowStock) {
    // Products with inventory at or below the shop's threshold
    filters.inventory = { lte: lowStockThreshold };
  }

  // Get categories for filter dropdown
  const categories = await db.category.findMany({
    where: { shopId },
    select: { id: true, name: true },
  });

  // Count total products for pagination
  const totalProducts = await db.product.count({ where: filters });
  const totalPages = Math.ceil(totalProducts / perPage);

  // Get products with pagination and sorting
  const products = await db.product.findMany({
    where: filters,
    include: {
      categories: {
        select: { id: true, name: true, slug: true },
      },
      _count: {
        select: {
          variants: true,
          orderItems: true,
        },
      },
      discounts: {
        where: {
          enabled: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        select: {
          id: true,
          percentage: true,
        },
        take: 1, // Just get the first active discount
      },
    },
    orderBy: { [sort]: order },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  // Calculate total inventory and low stock counts for summary
  const productStats = await db.$queryRaw`
    SELECT 
      SUM(inventory) as totalInventory,
      COUNT(*) FILTER (WHERE inventory <= ${lowStockThreshold}) as lowStockCount,
      COUNT(*) FILTER (WHERE inventory = 0) as outOfStockCount
    FROM "Product"
    WHERE "shopId" = ${shopId}
  `;

  const stats = productStats[0] || {
    totalInventory: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your products, inventory, and categories
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Product Management</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/products/import"
                  className="flex items-center cursor-pointer"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Import Products
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/products/export"
                  className="flex items-center cursor-pointer"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  Export Products
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>View</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/products?view=list`}
                  className="flex items-center cursor-pointer"
                >
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/products?view=grid`}
                  className="flex items-center cursor-pointer"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Grid View
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/admin/products/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Total Products</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">
            {totalProducts}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Total Inventory</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">
            {stats.totalInventory || 0} units
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Inventory Status</div>
          <div className="flex gap-2 mt-1">
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              {stats.lowStockCount || 0} Low Stock
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200"
            >
              {stats.outOfStockCount || 0} Out of Stock
            </Badge>
          </div>
        </div>
      </div>

      <ProductFilters
        categories={categories}
        currentFilters={searchParams}
        lowStockThreshold={lowStockThreshold}
      />

      {/* List View */}
      {viewMode === "list" && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="text-gray-700">Product</TableHead>
                <TableHead className="text-gray-700">Price</TableHead>
                <TableHead className="text-gray-700">Inventory</TableHead>
                <TableHead className="text-gray-700">Categories</TableHead>
                <TableHead className="text-gray-700">Variants</TableHead>
                <TableHead className="text-gray-700">Barcode/SKU</TableHead>
                <TableHead className="text-gray-700">Discount</TableHead>
                <TableHead className="text-gray-700">Orders</TableHead>
                <TableHead className="text-right text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-8 text-gray-600"
                  >
                    No products found.{" "}
                    <Link
                      href="/admin/products/new"
                      className="text-indigo-600 hover:underline"
                    >
                      Create your first product
                    </Link>
                    .
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                          {product.images && product.images[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
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
                            href={`/admin/products/${product.id}`}
                            className="font-medium text-gray-800 hover:text-indigo-600 hover:underline"
                          >
                            {product.name}
                          </Link>
                          {product.description && (
                            <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {formatCurrency(product.price)}
                      {product.discounts && product.discounts.length > 0 && (
                        <div className="text-xs text-gray-500 line-through">
                          {formatCurrency(
                            product.price *
                              (1 + product.discounts[0].percentage / 100)
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          product.inventory <= 0
                            ? "text-red-500 font-medium"
                            : product.inventory <= lowStockThreshold
                            ? "text-amber-500 font-medium"
                            : "text-gray-700"
                        }
                      >
                        {product.inventory}
                      </span>
                      {product.inventory <= lowStockThreshold &&
                        product.inventory > 0 && (
                          <span className="ml-2 text-xs text-amber-500">
                            (Low)
                          </span>
                        )}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {product.categories.length > 0 ? (
                          product.categories.map((category) => (
                            <Badge
                              key={category.id}
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              {category.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">
                            No categories
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {product._count.variants > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-purple-700 border-purple-200"
                        >
                          {product._count.variants} variants
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          No variants
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      <div className="text-xs">
                        {product.barcode && (
                          <div className="flex items-center">
                            <span className="text-gray-500 mr-1">Barcode:</span>
                            <span className="text-gray-700">
                              {product.barcode}
                            </span>
                          </div>
                        )}
                        {product.sku && (
                          <div className="flex items-center">
                            <span className="text-gray-500 mr-1">SKU:</span>
                            <span className="text-gray-700">{product.sku}</span>
                          </div>
                        )}
                        {!product.barcode && !product.sku && (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.discounts && product.discounts.length > 0 ? (
                        <div className="flex items-center">
                          <Tag className="h-3 w-3 text-green-600 mr-1" />
                          <span className="text-green-600 font-medium">
                            {product.discounts[0].percentage}% OFF
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          No discount
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product._count.orderItems > 0 ? (
                        <div className="flex items-center">
                          <ShoppingBag className="h-3 w-3 text-blue-600 mr-1" />
                          <span className="text-blue-600">
                            {product._count.orderItems}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductListActions productId={product.id} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full bg-white border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600">
                No products found.{" "}
                <Link
                  href="/admin/products/new"
                  className="text-indigo-600 hover:underline"
                >
                  Create your first product
                </Link>
                .
              </p>
            </div>
          ) : (
            products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="h-48 bg-gray-100 relative">
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No image
                    </div>
                  )}

                  {/* Discount tag */}
                  {product.discounts && product.discounts.length > 0 && (
                    <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold">
                      {product.discounts[0].percentage}% OFF
                    </div>
                  )}

                  {/* Inventory status */}
                  <div className="absolute bottom-2 right-2">
                    {product.inventory <= 0 ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : product.inventory <= lowStockThreshold ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800 border-amber-200"
                      >
                        Low stock: {product.inventory}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 border-green-200"
                      >
                        In stock: {product.inventory}
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-medium text-gray-800 mb-1 truncate">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="hover:text-indigo-600 hover:underline"
                    >
                      {product.name}
                    </Link>
                  </h3>

                  <div className="flex justify-between items-center mb-2">
                    <div className="text-gray-700 font-medium">
                      {formatCurrency(product.price)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {product._count.variants > 0 &&
                        `${product._count.variants} variants`}
                    </div>
                  </div>

                  {/* Categories */}
                  {product.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {product.categories.slice(0, 2).map((category) => (
                        <Badge
                          key={category.id}
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                        >
                          {category.name}
                        </Badge>
                      ))}
                      {product.categories.length > 2 && (
                        <Badge
                          variant="outline"
                          className="bg-gray-50 text-gray-700 border-gray-200 text-xs"
                        >
                          +{product.categories.length - 2} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {product._count.orderItems > 0 ? (
                        <span className="flex items-center">
                          <ShoppingBag className="h-3 w-3 mr-1" />
                          {product._count.orderItems} orders
                        </span>
                      ) : (
                        "No orders"
                      )}
                    </span>
                    <ProductListActions productId={product.id} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <ProductPagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalProducts}
      />
    </div>
  );
}
