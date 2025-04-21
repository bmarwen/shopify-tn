// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// GET a specific product
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        shopId, // Ensure it belongs to this shop
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
    const body = await req.json();

    // Verify the product exists and belongs to this shop
    const existingProduct = await db.product.findUnique({
      where: {
        id: productId,
        shopId,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Extract and prepare the data for update
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
      categoryIds,
      images,
      variants,
      expiryDate,
      customFieldValues,
    } = body;

    // Generate slug if changed
    const productSlug = slugify(name);

    // If slug changed, check if it's already in use
    if (productSlug !== existingProduct.slug) {
      const slugExists = await db.product.findUnique({
        where: {
          shopId_slug: {
            shopId,
            slug: productSlug,
          },
        },
      });

      if (slugExists && slugExists.id !== productId) {
        return NextResponse.json(
          { error: "A product with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Update the product in a transaction
    const updatedProduct = await db.$transaction(async (tx) => {
      // Update the product
      const product = await tx.product.update({
        where: { id: productId },
        data: {
          name,
          slug: productSlug,
          description,
          price,
          cost,
          sku,
          barcode,
          inventory,
          tva,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          images: images || [],
          categories: {
            set: [], // Clear existing categories
            connect: categoryIds?.map((id: string) => ({ id })) || [],
          },
        },
        include: {
          categories: true,
        },
      });

      // Handle custom field values
      if (customFieldValues && customFieldValues.length > 0) {
        // Remove existing custom field values
        await tx.customFieldValue.deleteMany({
          where: { productId },
        });

        // Add new custom field values
        for (const field of customFieldValues) {
          await tx.customFieldValue.create({
            data: {
              customFieldId: field.customFieldId,
              value: field.value,
              productId,
            },
          });
        }
      }

      // Handle variants
      if (variants && variants.length > 0) {
        // Remove existing variants that aren't in the updated list
        const variantIds = variants
          .filter((v: any) => v.id)
          .map((v: any) => v.id);

        if (variantIds.length > 0) {
          await tx.productVariant.deleteMany({
            where: {
              productId,
              id: { notIn: variantIds },
            },
          });
        } else {
          // If no existing variants were kept, delete all
          await tx.productVariant.deleteMany({
            where: { productId },
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

    // Get the complete updated product
    const completeProduct = await db.product.findUnique({
      where: { id: productId },
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

    // Verify the product exists and belongs to this shop
    const product = await db.product.findUnique({
      where: {
        id: productId,
        shopId,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete in a transaction to ensure all related records are deleted properly
    await db.$transaction(async (tx) => {
      // 1. Delete custom field values associated with the product
      await tx.customFieldValue.deleteMany({
        where: { productId },
      });

      // 2. Delete variants associated with the product
      await tx.productVariant.deleteMany({
        where: { productId },
      });

      // 3. Delete discounts associated with the product
      await tx.discount.deleteMany({
        where: { productId },
      });

      // 4. Set productId to null in discount codes (since it's nullable)
      await tx.discountCode.updateMany({
        where: { productId },
        data: { productId: null },
      });

      // 5. Check for CartItems and OrderItems (this might be our blocker)
      const cartItemCount = await tx.cartItem.count({
        where: { productId },
      });

      if (cartItemCount > 0) {
        // Delete cart items that reference this product
        await tx.cartItem.deleteMany({
          where: { productId },
        });
      }

      const orderItemCount = await tx.orderItem.count({
        where: { productId },
      });

      if (orderItemCount > 0) {
        // Instead of blocking deletion, provide specific error
        throw new Error(
          "Cannot delete product that is in completed orders. Please archive it instead."
        );
      }

      // 6. Disconnect product from all categories (many-to-many relation)
      await tx.product.update({
        where: { id: productId },
        data: {
          categories: {
            set: [], // Remove all category connections
          },
        },
      });

      // 7. Finally delete the product
      await tx.product.delete({
        where: { id: productId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete product",
      },
      { status: 500 }
    );
  }
}
