import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { s3ImageService } from "@/lib/services/s3-image.service";

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

    // Process S3 image URLs
    let productWithUrls = { ...product };
    if (product.images && product.images.length > 0) {
      try {
        const processedImages = await Promise.all(
          product.images.map(async (image) => {
            if (s3ImageService.isS3Key(image)) {
              try {
                return await s3ImageService.getImageUrl(image);
              } catch (error) {
                console.error(`Error getting image URL for ${image}:`, error);
                return image; // Return original key if URL generation fails
              }
            }
            return image; // Return original URL if not an S3 key
          })
        );

        productWithUrls = {
          ...product,
          images: processedImages,
          s3Keys: product.images, // Store original keys for reference
        };
      } catch (error) {
        console.error("Error processing product images:", error);
        // Continue with original product if image processing fails
      }
    }

    return NextResponse.json(productWithUrls);
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

    // Process images - handle any new base64 images and track which S3 images to delete
    const processedImages = [];
    const imagesToDelete = [];

    // Find which existing images are being removed
    if (existingProduct.images && existingProduct.images.length > 0) {
      for (const oldImage of existingProduct.images) {
        if (
          s3ImageService.isS3Key(oldImage) &&
          (!images || !images.includes(oldImage))
        ) {
          imagesToDelete.push(oldImage);
        }
      }
    }

    // Process new images
    if (images && images.length > 0) {
      for (const image of images) {
        if (image.startsWith("data:")) {
          // New base64 image to upload to S3
          try {
            const fileNameBase = `${productSlug}-${Date.now()}`;
            const uploadResult = await s3ImageService.uploadImage(
              image,
              `${fileNameBase}.jpg`,
              "products"
            );
            processedImages.push(uploadResult.key);
          } catch (uploadError) {
            console.error("Error uploading product image to S3:", uploadError);
            // Skip this image if upload fails
          }
        } else {
          // Existing image URL or S3 key
          processedImages.push(image);
        }
      }
    }

    // Delete old S3 images that are no longer used
    for (const imageToDelete of imagesToDelete) {
      try {
        await s3ImageService.deleteImage(imageToDelete);
        console.log(`Deleted old product image: ${imageToDelete}`);
      } catch (deleteError) {
        console.error(
          `Error deleting product image ${imageToDelete}:`,
          deleteError
        );
        // Continue with update even if image deletion fails
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
          images: processedImages, // Use the processed images array
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

    // Process S3 image URLs for response
    let responseProduct = completeProduct;
    if (
      completeProduct &&
      completeProduct.images &&
      completeProduct.images.length > 0
    ) {
      const imageUrls = await Promise.all(
        completeProduct.images.map(async (image) => {
          if (s3ImageService.isS3Key(image)) {
            try {
              return await s3ImageService.getImageUrl(image);
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

    return NextResponse.json(responseProduct);
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
      select: {
        id: true,
        images: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get any S3 image keys that need to be deleted
    const s3ImagesToDelete =
      product.images?.filter((image) => s3ImageService.isS3Key(image)) || [];

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

      await tx.orderItem.updateMany({
        where: { productId },
        data: { productId: null },
      });

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

    // After successful transaction, delete images from S3
    if (s3ImagesToDelete.length > 0) {
      for (const imageKey of s3ImagesToDelete) {
        try {
          await s3ImageService.deleteImage(imageKey);
          console.log(`Deleted product image from S3: ${imageKey}`);
        } catch (error) {
          console.error(
            `Error deleting product image ${imageKey} from S3:`,
            error
          );
          // Continue even if S3 deletion fails - the product is already deleted
        }
      }
    }

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
