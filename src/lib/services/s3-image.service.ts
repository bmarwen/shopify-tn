// src/lib/services/s3-image.service.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-3",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || "your-store-bucket";

export interface UploadedImage {
  key: string; // S3 object key/filename
  url: string; // Full URL to access the image
  originalName: string; // Original filename
}

export const s3ImageService = {
  /**
   * Generates a unique filename for S3
   * @param originalName Original file name
   * @param prefix Optional prefix for organization (e.g., 'categories', 'products')
   */
  generateImageName(originalName: string, prefix?: string): string {
    // Get file extension
    const fileExt = originalName.split(".").pop() || "jpg";

    // Create unique ID
    const uniqueId = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    // Create final filename
    return prefix
      ? `${prefix}/${uniqueId}.${fileExt}`
      : `${uniqueId}.${fileExt}`;
  },

  /**
   * Uploads a base64 image to S3
   * @param base64Image Base64 encoded image data
   * @param originalName Original filename
   * @param prefix Optional prefix for organization
   */
  async uploadImage(
    base64Image: string,
    originalName: string,
    prefix?: string
  ): Promise<UploadedImage> {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique key/filename
    const key = this.generateImageName(originalName, prefix);

    // Determine content type from base64 string or fall back to jpeg
    const contentType = base64Image.match(/^data:image\/(\w+);base64,/)?.[1]
      ? `image/${base64Image.match(/^data:image\/(\w+);base64,/)?.[1]}`
      : "image/jpeg";

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ContentEncoding: "base64",
    });

    await s3Client.send(command);

    // Generate URL
    const url = `https://${bucketName}.s3.amazonaws.com/${key}`;

    return {
      key,
      url,
      originalName,
    };
  },

  /**
   * Get a presigned URL for an image (URLs valid for limited time)
   * @param key S3 object key
   * @param expiresIn Expiration time in seconds (default: 3600)
   */
  async getImageUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      // Return a fallback URL if there's an error
      return `https://${bucketName}.s3.amazonaws.com/${key}`;
    }
  },

  /**
   * Delete an image from S3
   * @param key S3 object key
   */
  async deleteImage(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error("Error deleting image from S3:", error);
      return false;
    }
  },

  /**
   * Get public URL for an image (no expiration)
   * @param key S3 object key
   */
  getPublicImageUrl(key: string): string {
    return `https://${bucketName}.s3.amazonaws.com/${key}`;
  },

  /**
   * Checks if a string is a valid S3 key
   * @param key Possible S3 key to check
   */
  isS3Key(key: string): boolean {
    // Simple validation - check if it's not a full URL and doesn't start with data:
    return !!key && !key.startsWith("data:") && !key.startsWith("http");
  },

  /**
   * Extracts the key from a full S3 URL
   * @param url Full S3 URL
   */
  extractKeyFromUrl(url: string): string | null {
    // Extract the key from a URL like https://bucket-name.s3.amazonaws.com/key
    const match = url.match(/https?:\/\/[^/]+\/(.+)/);
    return match ? match[1] : null;
  },
};

// Export default instance
export default s3ImageService;
