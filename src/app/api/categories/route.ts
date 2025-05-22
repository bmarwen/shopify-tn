import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { categoriesService } from "@/lib/services/categories.service";
import { serializeBigInt } from "@/lib/serializer";
import { slugify } from "@/lib/utils";
import { s3ImageService } from "@/lib/services/s3-image.service";
import { z } from "zod";

// Schema for creating and updating categories
const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(2, "Slug must be at least 2 characters").optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const shopId = session.user.shopId;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const withProductCount = searchParams.get("withProductCount") === "true";

    // If detailed data with product counts is requested
    if (withProductCount) {
      try {
        // Get all categories with counts and hierarchy information
        const categoriesWithCounts =
          await categoriesService.getCategoriesWithCounts(shopId, true);
        return NextResponse.json(serializeBigInt(categoriesWithCounts));
      } catch (error) {
        console.error("Error getting categories with product counts:", error);
        // Fallback to basic categories
        const basicCategories =
          await categoriesService.getCategoriesWithHierarchy(shopId);
        return NextResponse.json(serializeBigInt(basicCategories));
      }
    }

    // Build where clause
    const where: any = { shopId };

    // Filter by parent category if specified
    if (parentId) {
      where.parentId = parentId === "null" ? null : parentId;
    }

    // Get categories with hierarchy information and counts
    const categories = await db.category.findMany({
      where,
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Add image URLs for S3 images
    const categoriesWithUrls = await Promise.all(
      categories.map(async (category) => {
        if (category.image && s3ImageService.isS3Key(category.image)) {
          try {
            const imageUrl = await s3ImageService.getImageUrl(category.image);
            return { ...category, imageUrl };
          } catch (error) {
            console.error(
              `Error generating image URL for category ${category.id}:`,
              error
            );
            return category;
          }
        }
        return category;
      })
    );

    // Process categories to add level information
    const processedCategories = await categoriesService.addLevelsToCategories(
      categoriesWithUrls
    );

    // Serialize any BigInt values that might be in the response
    return NextResponse.json(serializeBigInt(processedCategories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user.shopId ||
      (session.user.role !== "SHOP_ADMIN" && session.user.role !== "SHOP_STAFF")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const shopId = session.user.shopId;
    const body = await req.json();

    // Validate input
    const validation = categorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, slug, description, image, parentId } = validation.data;

    // Process image if it's a base64 data URL
    let processedImage = image;
    if (image && image.startsWith("data:")) {
      try {
        // Upload the image to S3
        const generatedSlug = slug || slugify(name);
        const uploadResult = await s3ImageService.uploadImage(
          image,
          `${generatedSlug}-image.jpg`,
          "categories"
        );
        processedImage = uploadResult.key; // Store the S3 key
      } catch (uploadError) {
        console.error("Error uploading image to S3:", uploadError);
        // Continue with empty image if upload fails
        processedImage = "";
      }
    }

    // Create data object
    const categoryData = {
      name,
      slug: slug || slugify(name), // Use provided slug or generate from name
      description,
      image: processedImage,
      parentId,
    };

    // Create the category
    try {
      const category = await categoriesService.createCategory(
        categoryData,
        shopId
      );

      // Add image URL to response if it's an S3 key
      let responseData = category;
      if (category.image && s3ImageService.isS3Key(category.image)) {
        try {
          const imageUrl = await s3ImageService.getImageUrl(category.image);
          responseData = { ...category, imageUrl };
        } catch (error) {
          console.error("Error generating image URL:", error);
          // Continue without the image URL
        }
      }

      return NextResponse.json(responseData, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
