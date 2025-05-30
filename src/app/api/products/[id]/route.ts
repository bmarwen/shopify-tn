import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import s3EnhancedService from "@/lib/services/s3-enhanced.service";

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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Process S3 image URLs
    let productWithUrls = { ...product };
    if (product.images && product.images.length > 0) {
      try {
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
      sku,
      barcode,
      weight,
      dimensions,
      categoryIds,
      images,
      variants,
      expiryDate,
      customFieldValues,
    } = body;

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
          s3EnhancedService.isS3Key(oldImage) &&
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
            const uploadResult = await s3EnhancedService.uploadBase64Image(
              image,
              `${productSlug}-${Date.now()}.jpg`,
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
        await s3EnhancedService.deleteImage(imageToDelete);
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
          sku,
          barcode,
          weight,
          dimensions,
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

      // Legacy custom field handling removed - using variant-based custom fields now

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
          let variantRecord;
          
          if (variant.id) {
            // Update existing variant
            variantRecord = await tx.productVariant.update({
              where: { id: variant.id },
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
              },
            });

            // Delete existing custom field values for this variant
            await tx.variantCustomFieldValue.deleteMany({
              where: { variantId: variant.id },
            });
          } else {
            // Create new variant
            variantRecord = await tx.productVariant.create({
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
                productId,
              },
            });
          }

          // Create custom field values for this variant if any
          if (variant.customFieldValues && variant.customFieldValues.length > 0) {
            await Promise.all(
              variant.customFieldValues.map((cfv: any) =>
                tx.variantCustomFieldValue.create({
                  data: {
                    customFieldId: cfv.customFieldId,
                    value: cfv.value,
                    variantId: variantRecord.id,
                  },
                })
              )
            );
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

    // Process S3 image URLs for response
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
      product.images?.filter((image) => s3EnhancedService.isS3Key(image)) || [];

    // Delete in a transaction to ensure all related records are deleted properly
    await db.$transaction(async (tx) => {
      // 1. Delete variant custom field values associated with the product variants
      await tx.variantCustomFieldValue.deleteMany({
        where: {
          variant: {
            productId,
          },
        },
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
          await s3EnhancedService.deleteImage(imageKey);
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
