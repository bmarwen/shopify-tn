// src/lib/services/s3-enhanced.service.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Enhanced S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-3",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME || "shopify-tn-images-dev";
const publicUrl = process.env.S3_PUBLIC_URL || `https://${bucketName}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com`;

export interface UploadedImage {
  key: string;
  url: string;
  originalName: string;
  size: number;
  contentType: string;
  folder?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ImageMetadata {
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
  etag: string;
}

export type ImageFolder = 'products' | 'categories' | 'shops' | 'users' | 'logos' | 'banners' | 'temp' | 'discounts' | 'discount-codes';

export const s3EnhancedService = {
  // Configuration
  config: {
    bucketName,
    publicUrl,
    maxFileSize: parseInt(process.env.MAX_IMAGE_SIZE || '5242880'), // 5MB
    allowedTypes: process.env.ALLOWED_IMAGE_TYPES?.split(',') || [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif'
    ],
  },

  /**
   * Validate image file before upload
   */
  validateImage(file: File | { size: number; type: string }): { valid: boolean; error?: string } {
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(this.config.maxFileSize / 1024 / 1024)}MB`
      };
    }

    if (!this.config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed. Allowed types: ${this.config.allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  },

  /**
   * Generate optimized filename with folder structure
   */
  generateImageKey(originalName: string, folder: ImageFolder = 'temp', shopId?: string): string {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    
    // Sanitize original name
    const baseName = originalName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with dash
      .replace(/-+/g, '-') // Replace multiple dashes with single
      .slice(0, 20); // Limit length

    // Include shopId in the path if provided
    const path = shopId ? `${shopId}/${folder}` : folder;
    return `${path}/${timestamp}-${baseName}-${randomId}.${ext}`;
  },

  /**
   * Upload base64 image with enhanced features
   */
  async uploadBase64Image(
    base64Image: string,
    originalName: string,
    folder: ImageFolder = 'temp',
    onProgress?: (progress: UploadProgress) => void,
    shopId?: string
  ): Promise<UploadedImage> {
    try {
      // Validate base64 format
      if (!base64Image.startsWith('data:image/')) {
        throw new Error('Invalid base64 image format');
      }

      // Extract content type and data
      const matches = base64Image.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid base64 image format');
      }

      const [, imageType, base64Data] = matches;
      const contentType = `image/${imageType}`;
      
      // Convert to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Validate size
      const validation = this.validateImage({ size: buffer.length, type: contentType });
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate key
      const key = this.generateImageKey(originalName, folder, shopId);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        // Remove ACL since bucket doesn't support it
        Metadata: {
          originalName,
          uploadDate: new Date().toISOString(),
          folder,
        },
      });

      await s3Client.send(command);

      // Simulate progress for base64 uploads
      if (onProgress) {
        onProgress({ loaded: buffer.length, total: buffer.length, percentage: 100 });
      }

      return {
        key,
        url: this.getPublicUrl(key),
        originalName,
        size: buffer.length,
        contentType,
        folder,
      };
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      throw error;
    }
  },

  /**
   * Upload File object directly
   */
  async uploadFile(
    file: File,
    folder: ImageFolder = 'temp',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedImage> {
    try {
      // Validate file
      const validation = this.validateImage(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate key
      const key = this.generateImageKey(file.name, folder);

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        // Remove ACL since bucket doesn't support it
        Metadata: {
          originalName: file.name,
          uploadDate: new Date().toISOString(),
          folder,
        },
      });

      await s3Client.send(command);

      // Simulate progress
      if (onProgress) {
        onProgress({ loaded: file.size, total: file.size, percentage: 100 });
      }

      return {
        key,
        url: this.getPublicUrl(key),
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        folder,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    images: Array<{ file?: File; base64?: string; name: string }>,
    folder: ImageFolder = 'temp',
    onProgress?: (overall: UploadProgress, current: { index: number; progress: UploadProgress }) => void
  ): Promise<UploadedImage[]> {
    const results: UploadedImage[] = [];
    const totalImages = images.length;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      
      try {
        let result: UploadedImage;
        
        if (image.file) {
          result = await this.uploadFile(image.file, folder, (progress) => {
            if (onProgress) {
              onProgress(
                {
                  loaded: i * 100 + progress.percentage,
                  total: totalImages * 100,
                  percentage: ((i * 100 + progress.percentage) / (totalImages * 100)) * 100
                },
                { index: i, progress }
              );
            }
          });
        } else if (image.base64) {
          result = await this.uploadBase64Image(image.base64, image.name, folder, (progress) => {
            if (onProgress) {
              onProgress(
                {
                  loaded: i * 100 + progress.percentage,
                  total: totalImages * 100,
                  percentage: ((i * 100 + progress.percentage) / (totalImages * 100)) * 100
                },
                { index: i, progress }
              );
            }
          });
        } else {
          throw new Error('Either file or base64 must be provided');
        }

        results.push(result);
      } catch (error) {
        console.error(`Error uploading image ${i}:`, error);
        throw error;
      }
    }

    return results;
  },

  /**
   * Get public URL for an image
   */
  getPublicUrl(key: string): string {
    return `${publicUrl}/${key}`;
  },

  /**
   * Get presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      return this.getPublicUrl(key);
    }
  },

  /**
   * Delete image from S3
   */
  async deleteImage(key: string): Promise<boolean> {
    try {
      // If it's a full URL, extract the key
      let s3Key = key;
      if (key.startsWith('http')) {
        const extractedKey = this.extractKeyFromUrl(key);
        if (!extractedKey) {
          console.log('Could not extract S3 key from URL:', key);
          return true; // Return true for non-S3 URLs (like old relative paths)
        }
        s3Key = extractedKey;
      }

      // Skip deletion for non-S3 keys (like relative paths)
      if (!this.isS3Key(s3Key)) {
        console.log('Skipping deletion for non-S3 key:', s3Key);
        return true;
      }

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(command);
      console.log(`Successfully deleted image: ${s3Key}`);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  },

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(keys: string[]): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const key of keys) {
      const deleted = await this.deleteImage(key);
      if (deleted) {
        success.push(key);
      } else {
        failed.push(key);
      }
    }

    return { success, failed };
  },

  /**
   * Get image metadata
   */
  async getImageMetadata(key: string): Promise<ImageMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await s3Client.send(command);
      
      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        contentType: response.ContentType || 'unknown',
        etag: response.ETag || '',
      };
    } catch (error) {
      console.error('Error getting image metadata:', error);
      return null;
    }
  },

  /**
   * List images in a folder
   */
  async listImages(folder?: ImageFolder, maxKeys = 100): Promise<ImageMetadata[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: folder ? `${folder}/` : undefined,
        MaxKeys: maxKeys,
      });

      const response = await s3Client.send(command);
      
      return (response.Contents || []).map(item => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        contentType: 'unknown', // ListObjects doesn't return content type
        etag: item.ETag || '',
      }));
    } catch (error) {
      console.error('Error listing images:', error);
      return [];
    }
  },

  /**
  * Check if a string is an S3 key
  */
  isS3Key(key: string): boolean {
  return !!key && 
  !key.startsWith('data:') && 
  !key.startsWith('http') && 
  !key.startsWith('blob:') &&
  (key.includes('/') || key.includes('discount') || key.includes('product')); // Our keys always have folder structure or specific keywords
  },

  /**
   * Extract key from full URL
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    
    // Handle our public URLs
    if (url.startsWith(publicUrl)) {
      return url.replace(`${publicUrl}/`, '');
    }
    
    // Handle standard S3 URLs with different patterns
    const patterns = [
      /https?:\/\/[^/]+\/(.+)/, // Standard pattern
      /.*\/(.*(?:discount|product|category|shop).*\.[a-zA-Z0-9]+)/, // Pattern for files with specific keywords
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  },

  /**
   * Get folder from key
   */
  getFolderFromKey(key: string): ImageFolder | null {
    const parts = key.split('/');
    return parts.length > 1 ? parts[0] as ImageFolder : null;
  },

  /**
   * Move image to different folder
   */
  async moveImage(
    currentKey: string, 
    newFolder: ImageFolder, 
    newName?: string
  ): Promise<string> {
    try {
      // Get current image
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: currentKey,
      });
      
      const response = await s3Client.send(getCommand);
      
      // Generate new key
      const currentName = currentKey.split('/').pop() || 'image.jpg';
      const fileName = newName || currentName;
      const newKey = this.generateImageKey(fileName, newFolder);
      
      // Upload to new location
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: newKey,
        Body: response.Body,
        ContentType: response.ContentType,
        // Remove ACL since bucket doesn't support it
        Metadata: response.Metadata,
      });
      
      await s3Client.send(putCommand);
      
      // Delete original
      await this.deleteImage(currentKey);
      
      return newKey;
    } catch (error) {
      console.error('Error moving image:', error);
      throw error;
    }
  },
};

export default s3EnhancedService;
