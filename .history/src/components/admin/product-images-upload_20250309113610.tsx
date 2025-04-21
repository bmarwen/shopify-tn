// src/components/admin/product-images-upload.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Trash, Upload, MoveUp, MoveDown } from "lucide-react";

interface ProductImagesUploadProps {
  existingImages: string[];
  onImagesChange: (images: string[]) => void;
}

export default function ProductImagesUpload({
  existingImages = [],
  onImagesChange,
}: ProductImagesUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [images, setImages] = useState<string[]>(existingImages);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);

    try {
      // In a real implementation, you would upload to your storage service
      // For now, we'll just create local object URLs as a placeholder
      const newImages = [...images];

      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        // This is just a placeholder. In production, replace with actual upload logic
        // and store the returned URL
        const imageUrl = URL.createObjectURL(file);
        newImages.push(imageUrl);
      }

      setImages(newImages);
      onImagesChange(newImages);
    } catch (error) {
      console.error("Error uploading images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-3 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
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

      {isUploading && <p className="text-sm text-center">Uploading...</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {images.map((image, index) => (
            <Card key={index} className="relative group">
              <div className="aspect-square relative overflow-hidden rounded-md">
                <Image
                  src={image}
                  alt={`Product image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeImage(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, "up")}
                  disabled={index === 0}
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveImage(index, "down")}
                  disabled={index === images.length - 1}
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                {index === 0 ? "Main" : `Image ${index + 1}`}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
