// src/app/page.tsx
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Welcome to Para Shop",
  description: "The best online shopping experience",
};

async function getFeaturedProducts() {
  const subdomain = process.env.SHOP_SUBDOMAIN || "para";

  // Get shop ID first
  const shop = await db.shop.findUnique({
    where: {
      subdomain: subdomain,
    },
    select: {
      id: true,
    },
  });

  if (!shop) return [];

  // Get featured products
  const products = await db.product.findMany({
    where: {
      shopId: shop.id,
      inventory: {
        gt: 0,
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
  });

  return products;
}

async function getCategories() {
  const subdomain = process.env.SHOP_SUBDOMAIN || "para";

  // Get shop ID first
  const shop = await db.shop.findUnique({
    where: {
      subdomain: subdomain,
    },
    select: {
      id: true,
    },
  });

  if (!shop) return [];

  // Get top level categories
  const categories = await db.category.findMany({
    where: {
      shopId: shop.id,
      parentId: null,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      image: true,
    },
  });

  return categories;
}

export default async function HomePage() {
  const products = await getFeaturedProducts();
  const categories = await getCategories();

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative">
        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 pt-14 lg:w-full lg:max-w-2xl">
            <div className="relative px-6 py-32 sm:py-40 lg:px-8 lg:py-56 lg:pr-0">
              <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Welcome to Para Shop
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Discover amazing products at great prices. Shop with
                  confidence and enjoy our fast delivery and customer service.
                </p>
                <div className="mt-10 flex items-center gap-x-6">
                  <Link
                    href="/products"
                    className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Shop Now
                  </Link>
                  <Link
                    href="/categories"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    Browse Categories <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl py-16 sm:py-24 lg:max-w-none lg:py-12">
          <h2 className="text-2xl font-bold text-gray-900">Categories</h2>

          <div className="mt-6 space-y-12 lg:grid lg:grid-cols-3 lg:gap-x-6 lg:space-y-0">
            {categories.map((category) => (
              <div key={category.id} className="group relative">
                <div className="relative h-80 w-full overflow-hidden rounded-lg bg-white sm:aspect-h-1 sm:aspect-w-2 lg:aspect-h-1 lg:aspect-w-1 group-hover:opacity-75 sm:h-64">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      className="h-full w-full object-cover object-center"
                      width={500}
                      height={500}
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">{category.name}</span>
                    </div>
                  )}
                </div>
                <h3 className="mt-6 text-sm text-gray-500">
                  <Link href={`/categories/${category.slug}`}>
                    <span className="absolute inset-0" />
                    {category.name}
                  </Link>
                </h3>
                <p className="text-base font-semibold text-gray-900">
                  Browse collection
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured products section */}
      <div className="bg-white">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Featured Products
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
            {products.map((product) => (
              <div key={product.id} className="group relative">
                <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75 lg:h-80">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover object-center lg:h-full lg:w-full"
                      width={300}
                      height={300}
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">No image</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between">
                  <div>
                    <h3 className="text-sm text-gray-700">
                      <Link href={`/products/${product.slug}`}>
                        <span aria-hidden="true" className="absolute inset-0" />
                        {product.name}
                      </Link>
                    </h3>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    ${product.price.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
