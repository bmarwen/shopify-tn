// src/components/admin/discount/s3-image-upload.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import S3Image from "@/components/ui/image-upload/s3-image";
import SimpleS3Image from "@/components/ui/image-upload/simple-s3-image";
import TestS3Image from "@/components/ui/image-upload/test-s3-image";

interface S3ImageUploadProps {
  control: any;
  name: string;
  currentImage?: string;
  onError: (error: string) => void;
  formSubmitted?: boolean; // Add this to know when form was successfully submitted
}

export default function S3ImageUpload({
  control,
  name,
  currentImage,
  onError,
  formSubmitted = false,
}: S3ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempUploadedKey, setTempUploadedKey] = useState<string | null>(null); // Track temporary uploads

  // Cleanup function for temporary uploads
  const cleanupTempUpload = async (key: string) => {
    try {
      console.log('Cleaning up temporary upload:', key);
      const response = await fetch('/api/upload/s3/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      });
      
      if (response.ok) {
        console.log('Successfully cleaned up temporary upload:', key);
      } else {
        console.error('Failed to cleanup temporary upload:', key);
      }
    } catch (error) {
      console.error('Error cleaning up temporary upload:', error);
    }
  };

  // Cleanup on component unmount if there's a temp upload that wasn't saved
  useEffect(() => {
    return () => {
      if (tempUploadedKey && tempUploadedKey !== currentImage && !formSubmitted) {
        // Only cleanup if the temp upload is different from the original image AND form wasn't submitted
        console.log('Component unmounting - cleaning up unsaved temp upload:', tempUploadedKey);
        cleanupTempUpload(tempUploadedKey);
      }
    };
  }, [tempUploadedKey, currentImage, formSubmitted]);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    onError(''); // Clear any previous errors

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'discount');
      formData.append('prefix', 'discounts'); // S3 folder organization

      const response = await fetch('/api/upload/s3', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const result = await response.json();
      const s3Key = result.key; // S3 key, not full URL
      
      // Track this as a temporary upload
      setTempUploadedKey(s3Key);
      
      // Update form with S3 key
      onChange(s3Key);
      setImagePreview(s3Key);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      onError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = async (onChange: (value: string) => void) => {
    // If there's a temp uploaded image, clean it up
    if (tempUploadedKey && tempUploadedKey !== currentImage) {
      await cleanupTempUpload(tempUploadedKey);
    }
    
    onChange('');
    setImagePreview(null);
    setTempUploadedKey(null);
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 font-medium">
            Discount Image
          </FormLabel>
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative w-full max-w-sm mx-auto">
                <div className="w-80 h-80 bg-gray-100 rounded-lg overflow-hidden">
                  {console.log('Rendering TestS3Image with src:', imagePreview)}
                  <TestS3Image
                    src={imagePreview}
                    alt="Discount preview"
                    className="w-full h-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(field.onChange)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor={`${name}-upload`} className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload discount image
                    </span>
                    <span className="mt-2 block text-sm text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </span>
                  </label>
                  <input
                    id={`${name}-upload`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, field.onChange)}
                    className="sr-only"
                    disabled={isUploading}
                  />
                </div>
              </div>
            )}
            {isUploading && (
              <div className="text-center text-sm text-gray-500">
                Uploading image to S3...
              </div>
            )}
          </div>
          <FormDescription className="text-gray-600">
            Optional image to showcase your discount. Uploaded to AWS S3.
          </FormDescription>
          <FormMessage className="text-red-600" />
        </FormItem>
      )}
    />
  );
}
