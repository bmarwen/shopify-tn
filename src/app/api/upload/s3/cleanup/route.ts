// src/app/api/upload/s3/cleanup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import s3EnhancedService from "@/lib/services/s3-enhanced.service";

export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { error: "S3 key is required" },
        { status: 400 }
      );
    }

    console.log('Cleaning up S3 image:', key);

    // Delete the image from S3
    const deleted = await s3EnhancedService.deleteImage(key);

    if (deleted) {
      console.log('Successfully deleted S3 image:', key);
      return NextResponse.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      console.error('Failed to delete S3 image:', key);
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error cleaning up S3 image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
