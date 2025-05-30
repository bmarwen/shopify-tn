// src/components/ui/image-upload/s3-image-upload.tsx
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { ImageFolder } from '@/lib/services/s3-enhanced.service';
import SimpleS3Image from './simple-s3-image';

interface S3ImageUploadProps {
  value?: string; // Current image URL
  onChange?: (url: string | null) => void;
  folder?: ImageFolder;
  shopId?: string;
  maxWidth?: number;
  maxHeight?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function S3ImageUpload({
  value,
  onChange,
  folder = 'temp',
  shopId,
  maxWidth = 800,
  maxHeight = 600,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  className = '',
  disabled = false,
  placeholder = 'Click to upload an image or drag and drop',
}: S3ImageUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File is too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }

    if (!acceptedTypes.includes(file.type)) {
      return `Unsupported file format. Accepted formats: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`;
    }

    return null;
  }, [maxFileSize, acceptedTypes]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast({
        title: "File validation error",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create preview immediately
      const base64 = await fileToBase64(file);
      setPreviewUrl(base64);

      // Upload to S3
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [{
            data: base64,
            name: file.name,
          }],
          folder,
          shopId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.results && result.results[0] && result.results[0].success) {
        const uploadedImage = result.results[0].data;
        onChange?.(uploadedImage.url);
        setPreviewUrl(null); // Clear preview since we now have the real URL
        
        toast({
          title: "Upload successful",
          description: "Image uploaded successfully",
        });
      } else {
        throw new Error(result.results?.[0]?.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setPreviewUrl(null);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, onChange, folder, shopId, toast]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    
    const file = fileArray[0]; // Only handle the first file
    await handleFileUpload(file);
  }, [handleFileUpload]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files);
    }
    // Clear the input to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  // Remove image
  const handleRemove = useCallback(() => {
    onChange?.(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  // Click to select file
  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const currentImageUrl = previewUrl || value;
  const hasImage = Boolean(currentImageUrl);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${hasImage ? 'p-0' : 'p-6 text-center'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={hasImage ? undefined : handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        {hasImage ? (
          /* Image Preview */
          <div className="relative group">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-gray-100">
              {previewUrl ? (
                /* Preview from uploaded file */
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Existing image from S3 */
                <SimpleS3Image
                  src={value || ''}
                  alt="Uploaded image"
                  fill
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick();
                    }}
                    disabled={disabled || isUploading}
                    className="bg-white text-gray-900 hover:bg-gray-100"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    disabled={disabled || isUploading}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
              
              {/* Upload loading overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <div className="text-sm">Uploading...</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Upload Prompt */
          <div className={`space-y-2 ${isUploading ? 'pointer-events-none' : ''}`}>
            {isUploading ? (
              <>
                <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
                <div className="text-sm text-gray-600">Uploading...</div>
              </>
            ) : (
              <>
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-gray-500">
                  {acceptedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {(maxFileSize / 1024 / 1024).toFixed(1)}MB
                </div>
                <div className="text-xs text-gray-500">
                  Recommended: {maxWidth}x{maxHeight}px or similar aspect ratio
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      {!hasImage && !isUploading && (
        <div className="text-xs text-gray-500 text-center">
          {placeholder}
        </div>
      )}
    </div>
  );
}
