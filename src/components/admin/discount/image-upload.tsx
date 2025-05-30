// src/components/admin/discount/image-upload.tsx
"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ImageUploadProps {
  control: any;
  name: string;
  currentImage?: string;
  onError: (error: string) => void;
}

export default function ImageUpload({
  control,
  name,
  currentImage,
  onError,
}: ImageUploadProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(currentImage || null);
  const [isUploading, setIsUploading] = useState(false);

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

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'discount');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const result = await response.json();
      const imageUrl = result.url;
      
      onChange(imageUrl);
      setImagePreview(imageUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      onError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (onChange: (value: string) => void) => {
    onChange('');
    setImagePreview(null);
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
              <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Discount preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(field.onChange)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload discount image
                    </span>
                    <span className="mt-2 block text-sm text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </span>
                  </label>
                  <input
                    id="image-upload"
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
                Uploading image...
              </div>
            )}
          </div>
          <FormDescription className="text-gray-600">
            Optional image to showcase your discount
          </FormDescription>
          <FormMessage className="text-red-600" />
        </FormItem>
      )}
    />
  );
}
