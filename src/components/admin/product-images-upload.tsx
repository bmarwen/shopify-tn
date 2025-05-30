// src/components/admin/product-images-upload.tsx
"use client";

import { useState, useEffect } from "react";
import ImageUploader from "@/components/ui/image-upload/image-uploader";
import ImageGallery from "@/components/ui/image-upload/image-gallery";
import { useImageUpload } from "@/hooks/use-image-upload";

interface ProductImagesUploadProps {
  existingImages?: string[];
  onImagesChange: (images: string[]) => void;
}

export default function ProductImagesUpload({
  existingImages = [],
  onImagesChange,
}: ProductImagesUploadProps) {
  const [images, setImages] = useState<string[]>(existingImages);

  // Sync with existingImages when they change
  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  const { uploadMultipleImages, deleteMultipleImages, isUploading } = useImageUpload({
    folder: 'products',
    maxFiles: 10,
    onUploadComplete: (uploadedImages) => {
      // Add new images to existing ones
      const newImageKeys = uploadedImages.map(img => img.key);
      const updatedImages = [...images, ...newImageKeys];
      setImages(updatedImages);
      onImagesChange(updatedImages);
    },
  });

  // Handle images change from gallery (reorder, delete)
  const handleImagesChange = (updatedImages: string[]) => {
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  return (
    <div className="space-y-6">
      {/* Image Upload */}
      <div>
        <h3 className="text-lg font-medium mb-4" style={{ color: "#2c3e50" }}>
          Upload New Images
        </h3>
        
        <ImageUploader
          folder="products"
          multiple={true}
          maxFiles={10}
          maxFileSize={5 * 1024 * 1024} // 5MB
          acceptedTypes={['image/jpeg', 'image/png', 'image/webp', 'image/gif']}
          onUploadComplete={(uploadedImages) => {
            const newImageKeys = uploadedImages.map(img => img.key);
            const updatedImages = [...images, ...newImageKeys];
            setImages(updatedImages);
            onImagesChange(updatedImages);
          }}
          disabled={isUploading}
        />
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4" style={{ color: "#2c3e50" }}>
            Product Images ({images.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            📌 The first image will be used as the main product image. You can reorder images by using the move buttons.
          </p>
          <ImageGallery
            images={images}
            onImagesChange={handleImagesChange}
            editable={true}
            maxHeight={600}
            columns={5}
            showActions={true}
          />
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
          <div className="text-sm">No images uploaded yet</div>
          <div className="text-xs mt-1">Upload images using the area above</div>
        </div>
      )}
    </div>
  );
}
