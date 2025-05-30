// src/hooks/use-image-upload.ts
"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { ImageFolder } from '@/lib/services/s3-enhanced.service';

interface UploadedImage {
  key: string;
  url: string;
  originalName: string;
  size: number;
  contentType: string;
  folder?: string;
}

interface UseImageUploadOptions {
  folder?: ImageFolder;
  maxFiles?: number;
  maxFileSize?: number;
  onUploadComplete?: (images: UploadedImage[]) => void;
  onUploadError?: (error: string) => void;
}

interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  isUploading: boolean;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    folder = 'temp',
    maxFiles = 10,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    onUploadComplete,
    onUploadError,
  } = options;

  const { toast } = useToast();
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    uploaded: 0,
    failed: 0,
    isUploading: false,
  });

  // Upload single image
  const uploadSingleImage = useCallback(async (
    imageData: string,
    imageName: string
  ): Promise<UploadedImage | null> => {
    try {
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [{ data: imageData, name: imageName }],
          folder,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.results[0]?.success) {
        return result.results[0].data;
      } else {
        throw new Error(result.results[0]?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [folder]);

  // Upload multiple images
  const uploadMultipleImages = useCallback(async (
    images: Array<{ data: string; name: string }>
  ): Promise<UploadedImage[]> => {
    if (images.length === 0) {
      return [];
    }

    if (images.length > maxFiles) {
      throw new Error(`Maximum ${maxFiles} files allowed`);
    }

    setProgress({
      total: images.length,
      uploaded: 0,
      failed: 0,
      isUploading: true,
    });

    try {
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images,
          folder,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      const uploadedImages: UploadedImage[] = [];
      let uploaded = 0;
      let failed = 0;

      result.results.forEach((res: any) => {
        if (res.success) {
          uploadedImages.push(res.data);
          uploaded++;
        } else {
          failed++;
        }
      });

      setProgress({
        total: images.length,
        uploaded,
        failed,
        isUploading: false,
      });

      if (uploadedImages.length > 0) {
        onUploadComplete?.(uploadedImages);
        toast({
          title: "Upload successful",
          description: `${uploadedImages.length} image(s) uploaded successfully`,
        });
      }

      if (failed > 0) {
        onUploadError?.(`${failed} image(s) failed to upload`);
        toast({
          title: "Some uploads failed",
          description: `${failed} image(s) failed to upload`,
          variant: "destructive",
        });
      }

      return uploadedImages;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setProgress({
        total: images.length,
        uploaded: 0,
        failed: images.length,
        isUploading: false,
      });

      onUploadError?.(errorMessage);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [folder, maxFiles, onUploadComplete, onUploadError, toast]);

  // Upload from File objects
  const uploadFiles = useCallback(async (files: File[]): Promise<UploadedImage[]> => {
    // Convert files to base64
    const images = await Promise.all(
      Array.from(files).map(async (file) => {
        // Validate file size
        if (file.size > maxFileSize) {
          throw new Error(`File ${file.name} is too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`);
        }

        return new Promise<{ data: string; name: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({
            data: reader.result as string,
            name: file.name,
          });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    return uploadMultipleImages(images);
  }, [maxFileSize, uploadMultipleImages]);

  // Delete single image
  const deleteSingleImage = useCallback(async (key: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/upload/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys: [key],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Delete failed');
      }

      if (result.success) {
        toast({
          title: "Image deleted",
          description: "Image has been successfully deleted",
        });
        return true;
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Delete multiple images
  const deleteMultipleImages = useCallback(async (keys: string[]): Promise<{
    success: string[];
    failed: string[];
  }> => {
    try {
      const response = await fetch('/api/upload/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Delete failed');
      }

      if (result.deleted > 0) {
        toast({
          title: "Images deleted",
          description: `${result.deleted} image(s) deleted successfully`,
        });
      }

      if (result.failed > 0) {
        toast({
          title: "Some deletions failed",
          description: `${result.failed} image(s) could not be deleted`,
          variant: "destructive",
        });
      }

      return {
        success: result.successKeys || [],
        failed: result.failedKeys || [],
      };
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
      return {
        success: [],
        failed: keys,
      };
    }
  }, [toast]);

  // Reset progress
  const resetProgress = useCallback(() => {
    setProgress({
      total: 0,
      uploaded: 0,
      failed: 0,
      isUploading: false,
    });
  }, []);

  return {
    // Upload functions
    uploadSingleImage,
    uploadMultipleImages,
    uploadFiles,
    
    // Delete functions
    deleteSingleImage,
    deleteMultipleImages,
    
    // State
    progress,
    isUploading: progress.isUploading,
    
    // Utilities
    resetProgress,
  };
}
