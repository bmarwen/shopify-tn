// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { productsService } from "@/lib/services/products.service";
import { shopService } from "@/lib/services/shop.service";
import { slugify } from "@/lib/utils";
import { db } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serializer";

// GET products with filtering, sorting, and pagination
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;

    // Verify shop exists
    const shopExists = await shopService.shopExists(shopId);
    if (!shopExists) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "10");
    const sortField = searchParams.get("sort") || "createdAt";
    const sortOrder = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("category") || "";
    const inStock = searchParams.get("inStock") === "true";
    const lowStock = searchParams.get("lowStock") === "true";
    const expiringSoon = searchParams.get("expiringSoon") === "true";
    const viewMode = searchParams.get("view") || "list";

    // Get shop settings for low stock threshold
    const shopSettings = await shopService.getShopSettings(shopId);
    const lowStockThreshold = shopSettings?.lowStockThreshold || 5;

    // Prepare filters
    const filters = {
      shopId,
      search,
      categoryId: categoryId || undefined,
      inStock,
      lowStock,
      expiringSoon,
      lowStockThreshold,
    };

    // Prepare pagination
    const pagination = {
      page,
      perPage,
    };

    // Prepare sorting
    const sort = {
      sortField,
      sortOrder: sortOrder as "asc" | "desc",
    };

    // Get total products count for pagination
    const totalProducts = await productsService.getTotalProducts(filters);

    // Get products with pagination and sorting
    const products = await productsService.getProducts(
      filters,
      pagination,
      sort
    );

    // Get product statistics
    const productStats = await productsService.getProductStats(
      shopId,
      lowStockThreshold
    );

    // Serialize data to handle BigInt values
    const responseData = serializeBigInt({
      products,
      pagination: {
        total: totalProducts,
        page,
        perPage,
        totalPages: Math.ceil(totalProducts / perPage),
      },
      stats: productStats,
      filter: {
        lowStockThreshold,
      },
      viewMode,
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// CREATE a new product
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !session.user.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;

    // Parse the request body
    const body = await req.json();

    const {
      name,
      slug,
      description,
      price,
      cost,
      sku,
      barcode,
      inventory,
      tva,
      weight,
      categoryIds,
      images,
      variants,
      expiryDate,
      customFields = [],
    } = body;

    // Validate required fields
    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    const productSlug = slug || slugify(name);

    // Check if slug is already in use
    const existingProduct = await db.product.findUnique({
      where: {
        shopId_slug: {
          shopId,
          slug: productSlug,
        },
      },
    });

    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this slug already exists" },
        { status: 400 }
      );
    }

    // Get shop settings for low stock threshold
    const shopSettings = await db.shopSettings.findUnique({
      where: { shopId },
    });

    const lowStockThreshold = shopSettings?.lowStockThreshold || 5;
    const lowStockAlert = inventory <= lowStockThreshold;

    // Process custom fields - validate they exist for this shop
    const customFieldsData = [];

    if (customFields && customFields.length > 0) {
      for (const cf of customFields) {
        // Look up the custom field in the database to ensure it exists
        let customField = await db.customField.findFirst({
          where: {
            shopId,
            name: cf.key,
          },
        });

        // If it doesn't exist, create it
        if (!customField) {
          customField = await db.customField.create({
            data: {
              name: cf.key,
              type: "TEXT", // Default type
              required: false,
              shopId,
            },
          });
        }

        customFieldsData.push({
          customFieldId: customField.id,
          value: cf.value,
        });
      }
    }

    // Create the product in a transaction
    const product = await db.$transaction(async (tx) => {
      // Create the product
      const newProduct = await tx.product.create({
        data: {
          name,
          slug: productSlug,
          description,
          price,
          cost,
          sku,
          barcode,
          inventory,
          tva: tva || 19, // Default TVA to 19% if not provided
          lowStockAlert,
          weight,
          images: images || [],
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          shopId,
          categories: {
            connect: categoryIds?.map((id: string) => ({ id })) || [],
          },
        },
      });

      // Create custom field values
      if (customFieldsData.length > 0) {
        await Promise.all(
          customFieldsData.map((cfData) =>
            tx.customFieldValue.create({
              data: {
                ...cfData,
                productId: newProduct.id,
              },
            })
          )
        );
      }

      // Create variants if provided
      if (variants && variants.length > 0) {
        await Promise.all(
          variants.map((variant: any) =>
            tx.productVariant.create({
              data: {
                name: variant.name,
                price: variant.price,
                inventory: variant.inventory,
                sku: variant.sku,
                options: variant.options,
                productId: newProduct.id,
              },
            })
          )
        );
      }

      return newProduct;
    });

    // Get the complete product with relationships
    const completeProduct = await db.product.findUnique({
      where: { id: product.id },
      include: {
        categories: true,
        variants: true,
        customFields: {
          include: {
            customField: true,
          },
        },
      },
    });

    // Serialize the response
    return NextResponse.json(serializeBigInt(completeProduct), { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
