// src/app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { categoriesService } from "@/lib/services/categories.service";
import { serializeBigInt } from "@/lib/serializer";
import { s3ImageService } from "@/lib/services/s3-image.service";
import { z } from "zod";

// Schema for updating categories
const categoryUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

// GET a specific category
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
    const categoryId = params.id;

    // Get the category
    const category = await categoriesService.getCategoryById(
      categoryId,
      shopId
    );
    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Get total product count including subcategories
    const totalProducts = await categoriesService.getCategoryProductCount(
      categoryId,
      shopId
    );

    // If the category has an image that is an S3 key, generate a URL for it
    let categoryWithImageUrl = { ...category, totalProducts };
    if (category.image && s3ImageService.isS3Key(category.image)) {
      try {
        const imageUrl = await s3ImageService.getImageUrl(category.image);
        // Add the image URL to the response
        categoryWithImageUrl = {
          ...category,
          totalProducts,
          imageUrl, // Add the URL for frontend use
        };
      } catch (error) {
        console.error("Error generating image URL:", error);
        // Continue without the image URL if there's an error
      }
    }

    return NextResponse.json(serializeBigInt(categoryWithImageUrl));
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// UPDATE a category
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
    const categoryId = params.id;
    const body = await req.json();

    // Validate input
    const validation = categoryUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    // Prepare data for update
    const updateData = {
      name: body.name,
      slug: body.slug,
      description: body.description,
      parentId: body.parentId === "" ? null : body.parentId,
      image: body.image,
    };

    try {
      // Handle image changes - if old image was an S3 key and it's being replaced or removed
      const existingCategory = await categoriesService.getCategoryById(
        categoryId,
        shopId
      );

      if (
        existingCategory?.image &&
        s3ImageService.isS3Key(existingCategory.image) &&
        existingCategory.image !== body.image
      ) {
        // Try to delete the old image - don't block the update if this fails
        try {
          await s3ImageService.deleteImage(existingCategory.image);
        } catch (deleteError) {
          console.error("Error deleting old image:", deleteError);
          // Continue with update even if image delete fails
        }
      }

      // Update the category
      const category = await categoriesService.updateCategory(
        categoryId,
        shopId,
        updateData
      );

      // Get total product count including subcategories
      const totalProducts = await categoriesService.getCategoryProductCount(
        categoryId,
        shopId
      );

      // Add total product count to the response
      const responseData = { ...category, totalProducts };
      return NextResponse.json(serializeBigInt(responseData));
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Failed to update category" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE a category
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
    const categoryId = params.id;

    try {
      // Get the category before deletion to check for image
      const categoryToDelete = await categoriesService.getCategoryById(
        categoryId,
        shopId
      );

      // Delete the category
      await categoriesService.deleteCategory(categoryId, shopId);

      // If the category had an S3 image, delete it too
      if (
        categoryToDelete?.image &&
        s3ImageService.isS3Key(categoryToDelete.image)
      ) {
        try {
          await s3ImageService.deleteImage(categoryToDelete.image);
        } catch (deleteError) {
          console.error("Error deleting category image:", deleteError);
          // Category is already deleted, so just log the error
        }
      }

      return NextResponse.json(
        {
          success: true,
          message: "Category successfully deleted",
        },
        { status: 200 }
      );
    } catch (error: any) {
      return NextResponse.json(
        {
          error: error.message || "Failed to delete category",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
