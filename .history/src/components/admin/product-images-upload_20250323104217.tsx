// src/components/admin/product-images-upload.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trash,
  Upload,
  MoveUp,
  MoveDown,
  PlusCircle,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImagesUploadProps {
  existingImages: string[];
  onImagesChange: (images: string[]) => void;
}

export default function ProductImagesUpload({
  existingImages = [],
  onImagesChange,
}: ProductImagesUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(existingImages || []);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>(
    {}
  );

  // Initialize preview images from existing images and sync when props change
  useEffect(() => {
    setImages(existingImages || []);

    // Initialize preview images for existing images
    const initialPreviews: Record<string, string> = {};
    existingImages?.forEach((img: string) => {
      // Only create previews for items that appear to be URLs or local paths
      if (
        (img.startsWith("http") || img.startsWith("/")) &&
        !previewImages[img]
      ) {
        initialPreviews[img] = img;
      }
    });

    if (Object.keys(initialPreviews).length > 0) {
      setPreviewImages((prev) => ({ ...prev, ...initialPreviews }));
    }
  }, [existingImages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);

    try {
      // In a real implementation, you would upload to your storage service
      // For now, we'll just create local object URLs as a placeholder
      const newImages = [...images];
      const newPreviews = { ...previewImages };

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];

        // Create a unique ID for this image
        const imageId = `image_${Date.now()}_${i}`;

        // Create a preview URL
        const imageUrl = URL.createObjectURL(file);
        newPreviews[imageId] = imageUrl;

        // In production, you would upload the file and get a permanent URL
        // For now, we'll use the imageId as a placeholder for the real URL
        newImages.push(imageId);
      }

      setImages(newImages);
      setPreviewImages(newPreviews);
      onImagesChange(newImages);
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const removedImageId = newImages.splice(index, 1)[0];

    // Clean up object URL to prevent memory leaks
    if (previewImages[removedImageId]) {
      URL.revokeObjectURL(previewImages[removedImageId]);
      const newPreviews = { ...previewImages };
      delete newPreviews[removedImageId];
      setPreviewImages(newPreviews);
    }

    setImages(newImages);
    onImagesChange(newImages);
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === images.length - 1)
    ) {
      return;
    }

    const newImages = [...images];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    [newImages[index], newImages[newIndex]] = [
      newImages[newIndex],
      newImages[index],
    ];

    setImages(newImages);
    onImagesChange(newImages);
  };

  // Helper to get image src (either from preview or from the image URL itself)
  const getImageSrc = (imageId: string): string | null => {
    // Check if it's a preview image first
    if (previewImages[imageId]) {
      return previewImages[imageId];
    }

    // Handle existing images that could be URLs or local paths
    if (imageId.startsWith("http") || imageId.startsWith("/")) {
      return imageId;
    }

    // Fallback to a placeholder for invalid images
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center w-full">
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-600">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {isUploading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-2"></div>
          <p className="text-gray-600">Uploading images...</p>
        </div>
      )}

      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-700">
              Product Images ({images.length})
            </h3>
            {images.length > 1 && (
              <p className="text-sm text-gray-500">
                Drag to reorder. First image will be the main product image.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <Card
                key={index}
                className="relative group border border-gray-200 rounded-lg overflow-hidden"
              >
                <div className="aspect-square relative overflow-hidden">
                  <div
                    className={cn(
                      "w-full h-full flex items-center justify-center bg-gray-100",
                      index === 0 && "border-2 border-indigo-500"
                    )}
                  >
                    {getImageSrc(image) ? (
                      <Image
                        src={getImageSrc(image) || "/placeholder.jpg"}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon className="w-12 h-12 mb-2" />
                        <span className="text-xs">Image Preview</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 bg-red-600 hover:bg-red-700"
                    onClick={() => removeImage(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>

                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-white text-gray-800"
                    onClick={() => moveImage(index, "up")}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 bg-white text-gray-800"
                    onClick={() => moveImage(index, "down")}
                    disabled={index === images.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {index === 0 ? "Main" : `Image ${index + 1}`}
                </div>
              </Card>
            ))}

            {/* Add image placeholder */}
            <Card
              className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              <div className="aspect-square flex flex-col items-center justify-center bg-gray-50 p-4">
                <PlusCircle className="w-10 h-10 mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 text-center">
                  Add more images
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
