// src/app/api/upload/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import s3EnhancedService, { ImageFolder } from "@/lib/services/s3-enhanced.service";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { images, folder = 'temp' } = body;

    // Validate request
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Images array is required" },
        { status: 400 }
      );
    }

    // Validate folder
    const validFolders: ImageFolder[] = ['products', 'categories', 'shops', 'users', 'logos', 'banners', 'temp'];
    if (!validFolders.includes(folder)) {
      return NextResponse.json(
        { error: `Invalid folder. Must be one of: ${validFolders.join(', ')}` },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Process each image
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        if (!image.data || !image.name) {
          throw new Error('Image data and name are required');
        }

        // Upload image
        const result = await s3EnhancedService.uploadBase64Image(
          image.data,
          image.name,
          folder
        );

        results.push({
          index: i,
          success: true,
          data: result,
        });
      } catch (error) {
        console.error(`Error uploading image ${i}:`, error);
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      uploaded: results.filter(r => r.success).length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("Error in image upload API:", error);
    return NextResponse.json(
      { 
        error: "Failed to upload images",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { keys } = body;

    // Validate request
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { error: "Keys array is required" },
        { status: 400 }
      );
    }

    // Delete images
    const result = await s3EnhancedService.deleteMultipleImages(keys);

    return NextResponse.json({
      success: result.failed.length === 0,
      deleted: result.success.length,
      failed: result.failed.length,
      successKeys: result.success,
      failedKeys: result.failed.length > 0 ? result.failed : undefined,
    });

  } catch (error) {
    console.error("Error in image delete API:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete images",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
