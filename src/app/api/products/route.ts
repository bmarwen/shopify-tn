import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { productsService } from "@/lib/services/products.service";
import { shopService } from "@/lib/services/shop.service";
import { slugify } from "@/lib/utils";
import { db } from "@/lib/prisma";
import { serializeBigInt } from "@/lib/serializer";
import s3EnhancedService from "@/lib/services/s3-enhanced.service";

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

    // Process S3 image URLs for each product
    const productsWithImageUrls = await Promise.all(
      products.map(async (product) => {
        // Process product image URLs if they're S3 keys
        if (product.images && product.images.length > 0) {
          const processedImages = await Promise.all(
            product.images.map(async (image) => {
              if (s3EnhancedService.isS3Key(image)) {
                try {
                  return s3EnhancedService.getPublicUrl(image);
                } catch (error) {
                  console.error(`Error getting image URL for ${image}:`, error);
                  return image; // Return original key if URL generation fails
                }
              }
              return image; // Return original URL if not an S3 key
            })
          );
          return { ...product, images: processedImages };
        }
        return product;
      })
    );

    // Get product statistics
    const productStats = await productsService.getProductStats(
      shopId,
      lowStockThreshold
    );

    // Serialize data to handle BigInt values
    const responseData = serializeBigInt({
      products: productsWithImageUrls,
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
      sku,
      barcode,
      weight,
      dimensions,
      categoryIds,
      images,
      variants,
      expiryDate,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate that we have at least one variant
    if (!variants || variants.length === 0) {
      return NextResponse.json(
        { error: "At least one variant is required" },
        { status: 400 }
      );
    }

    // Validate that all variants have required fields
    for (const variant of variants) {
      if (!variant.name || variant.price === undefined) {
        return NextResponse.json(
          { error: "All variants must have a name and price" },
          { status: 400 }
        );
      }
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

    // No need to calculate lowStockAlert here since it's variant-based now

    // No need to process legacy custom fields - they're now handled at variant level
    // Custom fields are now attached to individual variants

    // Process images - upload base64 data URLs to S3
    const processedImages = [];
    if (images && images.length > 0) {
      for (const image of images) {
        if (image && image.startsWith("data:")) {
          try {
            // Upload image to S3
            const uploadResult = await s3EnhancedService.uploadBase64Image(
              image,
              `${productSlug}-${Date.now()}.jpg`,
              "products"
            );
            processedImages.push(uploadResult.key); // Store S3 key
          } catch (uploadError) {
            console.error("Error uploading product image to S3:", uploadError);
            // Skip this image if upload fails
          }
        } else {
          // Keep existing image URLs or keys
          processedImages.push(image);
        }
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
          sku,
          barcode,
          weight,
          dimensions,
          images: processedImages, // Use processed image array
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          shopId,
          categories: {
            connect: categoryIds?.map((id: string) => ({ id })) || [],
          },
        },
      });

      // Create custom field values
      // No longer needed - custom fields are now handled at variant level

      // Create variants - required
      const createdVariants = await Promise.all(
        variants.map(async (variant: any) => {
          const newVariant = await tx.productVariant.create({
            data: {
              name: variant.name,
              price: variant.price,
              cost: variant.cost || null,
              tva: variant.tva || 19,
              inventory: variant.inventory || 0,
              sku: variant.sku || null,
              barcode: variant.barcode || null,
              images: variant.images || [],
              options: variant.options || {},
              productId: newProduct.id,
            },
          });

          // Create custom field values for this variant if any
          if (variant.customFieldValues && variant.customFieldValues.length > 0) {
            await Promise.all(
              variant.customFieldValues.map((cfv: any) =>
                tx.variantCustomFieldValue.create({
                  data: {
                    customFieldId: cfv.customFieldId,
                    value: cfv.value,
                    variantId: newVariant.id,
                  },
                })
              )
            );
          }

          return newVariant;
        })
      );

      return newProduct;
    });

    // Get the complete product with relationships
    const completeProduct = await db.product.findUnique({
      where: { id: product.id },
      include: {
        categories: true,
        variants: {
          include: {
            customFields: {
              include: {
                customField: true,
              },
            },
          },
        },
      },
    });

    // Generate image URLs for S3 keys in the response
    let responseProduct = completeProduct;
    if (
      completeProduct &&
      completeProduct.images &&
      completeProduct.images.length > 0
    ) {
      const imageUrls = await Promise.all(
      completeProduct.images.map(async (image) => {
      if (s3EnhancedService.isS3Key(image)) {
      try {
      return s3EnhancedService.getPublicUrl(image);
      } catch (error) {
      console.error(`Error getting image URL for ${image}:`, error);
      return image; // Return original key if URL generation fails
      }
      }
      return image; // Return original URL if not an S3 key
      })
      );

      responseProduct = {
        ...completeProduct,
        images: imageUrls,
        s3Keys: completeProduct.images, // Keep original keys for reference
      };
    }

    // Serialize the response
    return NextResponse.json(serializeBigInt(responseProduct), { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
