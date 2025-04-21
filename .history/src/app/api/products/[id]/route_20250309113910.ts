// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET a single product by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.shopId;
    const productId = params.id;

    // Get the product
    const product = await db.product.findUnique({
      where: {
        id: productId,
        shopId, // Ensure it belongs to the current shop
      },
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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// UPDATE a product
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const productId = params.id;

    // Check if product exists and belongs to this shop
    const existingProduct = await db.product.findUnique({
      where: {
        id: productId,
        shopId,
      },
      include: {
        variants: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Parse the request body
    const body = await req.json();

    const {
      name,
      slug,
      description,
      price,
      compareAtPrice,
      cost,
      sku,
      barcode,
      inventory,
      weight,
      categoryIds,
      images,
      variants,
      expiryDate,
    } = body;

    // Validate required fields
    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    // Check if new slug is unique (if changed)
    const productSlug = slug || slugify(name);

    if (productSlug !== existingProduct.slug) {
      const slugExists = await db.product.findUnique({
        where: {
          shopId_slug: {
            shopId,
            slug: productSlug,
          },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "A product with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Get shop settings for low stock threshold
    const shopSettings = await db.shopSettings.findUnique({
      where: { shopId },
    });

    const lowStockThreshold = shopSettings?.lowStockThreshold || 5;
    const lowStockAlert = inventory <= lowStockThreshold;

    // Update product in a transaction
    const updatedProduct = await db.$transaction(async (tx) => {
      // Update the product
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          slug: productSlug,
          description,
          price,
          compareAtPrice,
          cost,
          sku,
          barcode,
          inventory,
          lowStockAlert,
          weight,
          images: images || [],
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          categories: {
            set: [], // Remove all existing connections
            connect: categoryIds?.map((id: string) => ({ id })) || [],
          },
        },
      });

      // Handle variants
      if (variants && variants.length > 0) {
        // Get existing variant IDs to determine which to delete
        const existingVariantIds = existingProduct.variants.map((v) => v.id);
        const updatedVariantIds = variants
          .filter((v) => v.id)
          .map((v) => v.id) as string[];

        // Delete variants that are no longer present
        const variantsToDelete = existingVariantIds.filter(
          (id) => !updatedVariantIds.includes(id)
        );

        if (variantsToDelete.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              id: { in: variantsToDelete },
            },
          });
        }

        // Update or create variants
        for (const variant of variants) {
          if (variant.id) {
            // Update existing variant
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                name: variant.name,
                price: variant.price,
                inventory: variant.inventory,
                sku: variant.sku,
                options: variant.options,
              },
            });
          } else {
            // Create new variant
            await tx.productVariant.create({
              data: {
                name: variant.name,
                price: variant.price,
                inventory: variant.inventory,
                sku: variant.sku,
                options: variant.options,
                productId,
              },
            });
          }
        }
      } else {
        // If no variants provided, delete all existing variants
        await tx.productVariant.deleteMany({
          where: { productId },
        });
      }

      return product;
    });

    // Get the complete updated product with relationships
    const completeProduct = await db.product.findUnique({
      where: { id: productId },
      include: {
        categories: true,
        variants: true,
      },
    });

    return NextResponse.json(completeProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE a product
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const productId = params.id;

    // Check if product exists and belongs to this shop
    const product = await db.product.findUnique({
      where: {
        id: productId,
        shopId,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete the product and related records in a transaction
    await db.$transaction(async (tx) => {
      // Delete related records first
      await tx.productVariant.deleteMany({
        where: { productId },
      });

      await tx.customFieldValue.deleteMany({
        where: { productId },
      });

      // Finally delete the product
      await tx.product.delete({
        where: { id: productId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
