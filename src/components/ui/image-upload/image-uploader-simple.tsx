// src/components/ui/image-upload/image-uploader-simple.tsx
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { ImageFolder } from '@/lib/services/s3-enhanced.service';

interface UploadedImage {
  key: string;
  url: string;
  originalName: string;
  size: number;
  contentType: string;
  folder?: string;
}

interface ImageUploaderProps {
  folder?: ImageFolder;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (images: UploadedImage[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
  existingImages?: string[];
}

interface PreviewImage {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  error?: string;
  uploaded?: UploadedImage;
}

export default function ImageUploaderSimple({
  folder = 'temp',
  multiple = true,
  maxFiles = 5,
  maxFileSize = 5 * 1024 * 1024,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  onUploadComplete,
  onUploadError,
  className = '',
  disabled = false,
  existingImages = [],
}: ImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File ${file.name} is too large. Maximum size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }

    if (!acceptedTypes.includes(file.type)) {
      return `File ${file.name} has unsupported format. Accepted formats: ${acceptedTypes.join(', ')}`;
    }

    return null;
  }, [maxFileSize, acceptedTypes]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (!multiple && fileArray.length > 1) {
      toast({
        title: "Multiple files not allowed",
        description: "Please select only one file",
        variant: "destructive",
      });
      return;
    }

    if (previews.length + fileArray.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    const newPreviews: PreviewImage[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      
      if (error) {
        toast({
          title: "File validation error",
          description: error,
          variant: "destructive",
        });
        continue;
      }

      const objectUrl = URL.createObjectURL(file);
      console.log(`🖼️ Created preview for: ${file.name}`);
      console.log(`📁 File type: ${file.type}, Size: ${(file.size / 1024).toFixed(1)}KB`);
      console.log(`🔗 Object URL: ${objectUrl}`);

      const preview: PreviewImage = {
        id: Math.random().toString(36).substring(2),
        file,
        preview: objectUrl,
        uploading: false,
        progress: 0,
      };

      newPreviews.push(preview);
    }

    setPreviews(prev => [...prev, ...newPreviews]);
  }, [multiple, maxFiles, previews.length, validateFile, toast]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

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
  }, [handleFileSelect]);

  const removePreview = useCallback((id: string) => {
    setPreviews(prev => {
      const updated = prev.filter(p => p.id !== id);
      const toRemove = prev.find(p => p.id === id);
      if (toRemove) {
        console.log(`🗑️ Cleaning up object URL: ${toRemove.preview}`);
        URL.revokeObjectURL(toRemove.preview);
      }
      return updated;
    });
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const uploadImages = useCallback(async () => {
    if (previews.length === 0) return;

    setIsUploading(true);
    
    try {
      const imagesToUpload = await Promise.all(
        previews.map(async (preview) => ({
          data: await fileToBase64(preview.file),
          name: preview.file.name,
        }))
      );

      setPreviews(prev => prev.map(p => ({ ...p, uploading: true, progress: 0 })));

      const response = await fetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imagesToUpload,
          folder,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      const uploadedImages: UploadedImage[] = [];
      
      result.results.forEach((res: any, index: number) => {
        if (res.success) {
          uploadedImages.push(res.data);
          setPreviews(prev => prev.map((p, i) => 
            i === index 
              ? { ...p, uploading: false, progress: 100, uploaded: res.data }
              : p
          ));
        } else {
          setPreviews(prev => prev.map((p, i) => 
            i === index 
              ? { ...p, uploading: false, error: res.error }
              : p
          ));
        }
      });

      if (uploadedImages.length > 0) {
        onUploadComplete?.(uploadedImages);
        toast({
          title: "Upload successful",
          description: `${uploadedImages.length} image(s) uploaded successfully`,
        });
      }

      if (result.failed > 0) {
        toast({
          title: "Some uploads failed",
          description: `${result.failed} image(s) failed to upload`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setPreviews(prev => prev.map(p => ({ 
        ...p, 
        uploading: false, 
        error: errorMessage 
      })));
      
      onUploadError?.(errorMessage);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [previews, folder, onUploadComplete, onUploadError, toast]);

  const clearAll = useCallback(() => {
    console.log(`🧹 Clearing all ${previews.length} preview(s)`);
    previews.forEach(preview => {
      URL.revokeObjectURL(preview.preview);
    });
    setPreviews([]);
  }, [previews]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            <span className="font-medium">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-gray-500">
            {acceptedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {(maxFileSize / 1024 / 1024).toFixed(1)}MB
          </div>
          {multiple && (
            <div className="text-xs text-gray-500">
              Maximum {maxFiles} files
            </div>
          )}
        </div>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="space-y-6">
          {/* Actions Bar */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Images sélectionnées ({previews.length})
                  </h4>
                  <p className="text-xs text-gray-500">
                    Prêtes pour l'upload
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={uploadImages}
                  disabled={isUploading || previews.every(p => p.uploaded || p.error)}
                  size="default"
                  className="px-6 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all duration-200 min-w-[140px]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {previews.filter(p => !p.uploaded && !p.error).length} Image{previews.filter(p => !p.uploaded && !p.error).length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={clearAll}
                  disabled={isUploading}
                  className="px-6 py-2.5 text-sm font-medium border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 min-w-[100px]"
                >
                  <X className="h-4 w-4 mr-2" />
                  Effacer
                </Button>
              </div>
            </div>
          </div>

          {/* Images Grid - SIMPLIFIED VERSION */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((preview) => (
              <div key={preview.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 relative">
                  
                  {/* Simple Image Preview - Always Visible */}
                  <img
                    src={preview.preview}
                    alt={preview.file.name}
                    className="w-full h-full object-cover"
                    onLoad={(e) => {
                      console.log(`✅ Preview image loaded successfully: ${preview.file.name}`);
                      console.log(`📏 Dimensions: ${e.currentTarget.naturalWidth}x${e.currentTarget.naturalHeight}`);
                    }}
                    onError={(e) => {
                      console.error(`❌ Preview image failed to load: ${preview.file.name}`);
                      console.error('❌ Preview URL was:', preview.preview);
                      // Show a broken image indicator
                      e.currentTarget.style.display = 'none';
                    }}
                    style={{
                      backgroundColor: '#f3f4f6',
                      objectFit: 'cover'
                    }}
                  />

                  {/* Fallback for broken images */}
                  <div 
                    className="absolute inset-0 bg-gray-200 flex items-center justify-center"
                    style={{ 
                      display: preview.error ? 'flex' : 'none'
                    }}
                  >
                    <div className="text-center text-gray-500">
                      <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-xs">Preview Error</div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all">
                    <button
                      type="button"
                      onClick={() => removePreview(preview.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      disabled={preview.uploading}
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Upload Progress */}
                  {preview.uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <div className="text-xs">Uploading...</div>
                      </div>
                    </div>
                  )}

                  {/* Success State */}
                  {preview.uploaded && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                      <div className="text-center text-green-700">
                        <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-xs font-medium">Uploaded</div>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {preview.error && (
                    <div className="absolute inset-0 bg-red-50 flex items-center justify-center">
                      <div className="text-center text-red-600">
                        <AlertCircle className="h-6 w-6 mx-auto mb-1" />
                        <div className="text-xs font-medium">Error</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="mt-2 text-xs text-gray-600 truncate" title={preview.file.name}>
                  {preview.file.name}
                </div>
                <div className="text-xs text-gray-500">
                  {(preview.file.size / 1024).toFixed(1)} KB • {preview.file.type.split('/')[1].toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
