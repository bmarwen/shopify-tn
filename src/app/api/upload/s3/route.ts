// src/app/api/upload/s3/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import s3EnhancedService from "@/lib/services/s3-enhanced.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const prefix = formData.get('prefix') as string || type;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    // Convert file to base64 for S3 service
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const base64WithPrefix = `data:${file.type};base64,${base64}`;

    // Upload to S3 using enhanced service with proper folder structure
    const folder = prefix as 'products' | 'categories' | 'shops' | 'users' | 'logos' | 'banners' | 'temp' || 'discounts';
    const uploadResult = await s3EnhancedService.uploadBase64Image(
      base64WithPrefix,
      file.name,
      folder,
      undefined, // onProgress callback
      session.user.shopId // Include shopId
    );

    return NextResponse.json({
      success: true,
      key: uploadResult.key,
      url: uploadResult.url,
      originalName: uploadResult.originalName,
      message: "Image uploaded successfully to S3",
    });
  } catch (error: any) {
    console.error("Error uploading to S3:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image to S3" },
      { status: 500 }
    );
  }
}
