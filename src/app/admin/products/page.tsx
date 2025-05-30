"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { getImageUrl } from "@/lib/utils";
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
  Loader2,
  ImageIcon,
} from "lucide-react";
import ProductListActions from "@/components/admin/product-list-actions";
import ProductFilters from "@/components/admin/product-filters";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import Pagination from "@/components/admin/pagination";

// Define types for Product and category
interface Category {
  id: string;
  name: string;
  slug?: string;
  level?: number;
  parentId?: string | null;
}

interface ProductCounts {
  variants: number;
  orderItems: number;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  cost?: number;
  tva: number;
  inventory: number;
  sku?: string;
  barcode?: string;
  options: Record<string, any>;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  images: string[];
  categories: Category[];
  variants: ProductVariant[];
  _count: ProductCounts;
  discounts: Array<{
    id: string;
    percentage: number;
  }>;
}

export default function ProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Utility functions for variant-based calculations
  const getProductPrice = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return 0;
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return minPrice === maxPrice ? minPrice : minPrice; // Show min price
  };

  const getProductInventory = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return 0;
    return product.variants.reduce((total, variant) => total + variant.inventory, 0);
  };

  const getProductPriceDisplay = (product: Product) => {
    if (!product.variants || product.variants.length === 0) return "No variants";
    const prices = product.variants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) {
      return formatCurrency(minPrice, "DT");
    }
    return `${formatCurrency(minPrice, "DT")} - ${formatCurrency(maxPrice, "DT")}`;
  };

  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [productStats, setProductStats] = useState({
    totalInventory: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Parse query parameters
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("perPage") || "10");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("category") || "";
  const inStock = searchParams.get("inStock") === "true";
  const lowStock = searchParams.get("lowStock") === "true";
  const viewMode = searchParams.get("view") || "list";

  // Fetch data effect
  useEffect(() => {
    if (status === "loading" || !session?.user?.shopId) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch categories and products in parallel
        const [categoriesResponse, productsResponse] = await Promise.allSettled([
          categories.length === 0 ? fetch("/api/categories") : Promise.resolve(null),
          apiClient.products.getProducts({
            page,
            perPage,
            sort,
            order,
            search,
            category: categoryId,
            inStock: inStock ? "true" : undefined,
            lowStock: lowStock ? "true" : undefined,
            view: viewMode,
          }),
        ]);

        // Handle categories response
        if (categoriesResponse.status === "fulfilled" && categoriesResponse.value) {
          try {
            if (categoriesResponse.value.ok) {
              const categoriesData = await categoriesResponse.value.json();
              setCategories(categoriesData);
            } else {
              console.warn("Failed to fetch categories:", categoriesResponse.value.statusText);
            }
          } catch (error) {
            console.warn("Error parsing categories:", error);
          }
        }

        // Handle products response
        if (productsResponse.status === "fulfilled") {
          const data = productsResponse.value;
          setProducts(data.products || []);
          setTotalProducts(data.pagination?.total || 0);
          setTotalPages(data.pagination?.totalPages || 1);
          setLowStockThreshold(data.filter?.lowStockThreshold || 5);
          setProductStats(data.stats || {
            totalInventory: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
          });
        } else {
          throw new Error(productsResponse.reason?.message || "Failed to fetch products");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error instanceof Error ? error.message : "Failed to load products");
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [
    status,
    session?.user?.shopId,
    page,
    perPage,
    sort,
    order,
    search,
    categoryId,
    inStock,
    lowStock,
    viewMode,
    categories.length,
    toast,
  ]);

  // If loading or not authenticated
  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">
            Products
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your products and inventory
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
                  href={`/admin/products?view=list&${searchParams
                    .toString()
                    .replace(/^\?/, "&")
                    .replace(/view=[^&]*&?/, "")}`}
                  className="flex items-center cursor-pointer"
                >
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/products?view=grid&${searchParams
                    .toString()
                    .replace(/^\?/, "&")
                    .replace(/view=[^&]*&?/, "")}`}
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
            {productStats.totalInventory || 0} units
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">Inventory Status</div>
          <div className="flex gap-2 mt-1">
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              {productStats.lowStockCount || 0} Low Stock
            </Badge>
            <Badge
              variant="outline"
              className="bg-red-50 text-red-700 border-red-200"
            >
              {productStats.outOfStockCount || 0} Out of Stock
            </Badge>
          </div>
        </div>
      </div>

      <ProductFilters
        categories={categories}
        currentFilters={{
          search,
          category: categoryId,
          inStock: inStock ? "true" : undefined,
          lowStock: lowStock ? "true" : undefined,
          page: page.toString(),
          perPage: perPage.toString(),
          sort,
          order,
        }}
        lowStockThreshold={lowStockThreshold}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
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
                            <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                              {product.images && product.images[0] ? (
                                <Image
                                  src={getImageUrl(product.images[0])}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="object-cover object-center w-full h-full"
                                  unoptimized
                                  onError={(e) => {
                                    e.currentTarget.src = "/images/placeholder.svg";
                                  }}
                                />
                              ) : (
                                <div className="text-gray-400 text-xs flex items-center justify-center w-full h-full">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="font-medium text-gray-200 hover:text-blue-600 hover:underline"
                              >
                                {product.name}
                              </Link>
                              {product.description && (
                                <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">
                                  {product.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {getProductPriceDisplay(product)}
                          {product.discounts &&
                            product.discounts.length > 0 && (
                              <div className="text-xs text-green-500">
                                {product.discounts[0].percentage}% OFF
                              </div>
                            )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const totalInventory = getProductInventory(product);
                            return (
                              <span
                                className={
                                  totalInventory <= 0
                                    ? "text-red-500 font-medium"
                                    : totalInventory <= lowStockThreshold
                                    ? "text-amber-500 font-medium"
                                    : "text-gray-700"
                                }
                              >
                                {totalInventory}
                              </span>
                            );
                          })()
                          }
                          {(() => {
                            const totalInventory = getProductInventory(product);
                            return totalInventory <= lowStockThreshold &&
                              totalInventory > 0 && (
                                <span className="ml-2 text-xs text-amber-500">
                                  (Low)
                                </span>
                              );
                          })()
                          }
                        </TableCell>
                        <TableCell className="text-gray-700">
                          <div className="flex flex-wrap gap-1">
                            {product.categories &&
                            product.categories.length > 0 ? (
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
                          {product._count && product._count.variants > 0 ? (
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
                                <span className="text-gray-400 mr-1">
                                  Barcode:
                                </span>
                                <span className="text-gray-300">
                                  {product.barcode}
                                </span>
                              </div>
                            )}
                            {product.sku && (
                              <div className="flex items-center">
                                <span className="text-gray-500 mr-1">SKU:</span>
                                <span className="text-gray-700">
                                  {product.sku}
                                </span>
                              </div>
                            )}
                            {!product.barcode && !product.sku && (
                              <span className="text-gray-300">Not set</span>
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
                          {product._count && product._count.orderItems > 0 ? (
                            <div className="flex items-center">
                              <Link
                                href={`/admin/orders?product=${product.id}`}
                                className="flex items-center text-blue-400 hover:text-blue-600 hover:underline"
                              >
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                <span>{product._count.orderItems}</span>
                              </Link>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <ProductListActions
                            productId={product.id}
                            onDelete={() => {
                              setProducts((prev) =>
                                prev.filter((p) => p.id !== product.id)
                              );
                            }}
                          />
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
                        <div className="relative h-full w-full">
                          <Image
                            src={getImageUrl(product.images[0])}
                            alt={product.name}
                            fill
                            className="object-cover object-center"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.src = '/images/placeholder.svg';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <ImageIcon className="h-12 w-12 opacity-20" />
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
                        {(() => {
                          const totalInventory = getProductInventory(product);
                          if (totalInventory <= 0) {
                            return <Badge variant="destructive">Out of stock</Badge>;
                          } else if (totalInventory <= lowStockThreshold) {
                            return (
                              <Badge
                                variant="outline"
                                className="bg-amber-100 text-amber-800 border-amber-200"
                              >
                                Low stock: {totalInventory}
                              </Badge>
                            );
                          } else {
                            return (
                              <Badge
                                variant="outline"
                                className="bg-green-100 text-green-800 border-green-200"
                              >
                                In stock: {totalInventory}
                              </Badge>
                            );
                          }
                        })()
                        }
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-gray-200 mb-1 truncate">
                        <Link
                          href={`/admin/products/${product.id}`}
                          className="hover:text-indigo-600 hover:underline"
                        >
                          {product.name}
                        </Link>
                      </h3>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-gray-400 font-medium">
                          {getProductPriceDisplay(product)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {product._count &&
                            product._count.variants > 0 &&
                            `${product._count.variants} variants`}
                        </div>
                      </div>

                      {/* Categories */}
                      {product.categories && product.categories.length > 0 && (
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
                          {product._count && product._count.orderItems > 0 ? (
                            <Link
                              href={`/admin/orders?product=${product.id}`}
                              className="flex items-center text-gray-300 hover:text-blue-400 hover:underline"
                            >
                              <ShoppingBag className="h-3 w-3 mr-1" />
                              {product._count.orderItems} orders
                            </Link>
                          ) : (
                            "No orders"
                          )}
                        </span>
                        <ProductListActions
                          productId={product.id}
                          onDelete={() => {
                            setProducts((prev) =>
                              prev.filter((p) => p.id !== product.id)
                            );
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalProducts}
          />
        </>
      )}
    </div>
  );
}
