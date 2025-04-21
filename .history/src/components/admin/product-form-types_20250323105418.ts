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
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  // Initialize preview images from existing images and sync when props change
  useEffect(() => {
    setImages(existingImages || []);
    
    // Initialize preview images for existing images
    const initialPreviews: Record<string, string> = {};
    existingImages?.forEach((img: string) => {
      // Only create previews for items that appear to be URLs or paths
      if ((img.startsWith('http') || img.startsWith('/')) && !previewImages[img]) {
        initialPreviews[img] = img;
      }
    });
    
    if (Object.keys(initialPreviews).length > 0) {
      setPreviewImages(prev => ({...prev, ...initialPreviews}));
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
      co