// src/components/ui/image-upload/image-gallery.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Download, Move, Trash2 } from 'lucide-react';
import S3Image from './s3-image';
import s3EnhancedService from '@/lib/services/s3-enhanced.service';
import { useToast } from '@/components/ui/use-toast';

interface ImageGalleryProps {
  images: string[]; // Array of S3 keys or URLs
  onImagesChange?: (images: string[]) => void;
  editable?: boolean;
  maxHeight?: number;
  columns?: number;
  showActions?: boolean;
  className?: string;
}

export default function ImageGallery({
  images = [],
  onImagesChange,
  editable = false,
  maxHeight = 400,
  columns = 4,
  showActions = true,
  className = '',
}: ImageGalleryProps) {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());

  // Handle image deletion
  const handleDeleteImage = async (imageKey: string) => {
    if (!editable) return;

    console.log('🗑️ Starting delete for image:', imageKey);
    setDeletingImages(prev => new Set([...prev, imageKey]));

    try {
      // Extract key if it's a full URL, otherwise use as-is
      let key = imageKey;
      if (imageKey.startsWith('http')) {
        // Extract key from full URL
        const urlParts = imageKey.split('/');
        key = urlParts.slice(-2).join('/'); // Get 'products/filename'
      }
      
      console.log('🔑 Extracted key for deletion:', key);

      // Delete from S3 via API
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
      console.log('📥 Delete response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete image');
      }

      if (result.deleted > 0) {
        // Remove from local state
        const updatedImages = images.filter(img => img !== imageKey);
        onImagesChange?.(updatedImages);
        
        toast({
          title: "Image supprimée",
          description: "L'image a été supprimée avec succès",
        });
        
        console.log('✅ Image deleted successfully:', key);
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      toast({
        title: "Erreur de suppression",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'image",
        variant: "destructive",
      });
    } finally {
      setDeletingImages(prev => {
        const updated = new Set(prev);
        updated.delete(imageKey);
        return updated;
      });
    }
  };

  // Handle drag and drop reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!editable) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!editable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!editable || draggedIndex === null) return;
    e.preventDefault();
    
    if (draggedIndex !== dropIndex) {
      const newImages = [...images];
      const [draggedImage] = newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, draggedImage);
      onImagesChange?.(newImages);
      
      console.log(`🔄 Reordered image from ${draggedIndex} to ${dropIndex}`);
    }
    
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };
  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (!editable) return;

    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onImagesChange?.(newImages);
  };

  // Handle download
  const handleDownloadImage = async (imageKey: string) => {
    try {
      const url = s3EnhancedService.isS3Key(imageKey)
        ? s3EnhancedService.getPublicUrl(imageKey)
        : imageKey;

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = imageKey.split('/').pop() || 'image';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  // Handle view in new tab
  const handleViewImage = (imageKey: string) => {
    const url = s3EnhancedService.isS3Key(imageKey)
      ? s3EnhancedService.getPublicUrl(imageKey)
      : imageKey;
    
    window.open(url, '_blank');
  };

  if (images.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <div className="text-sm">No images to display</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div 
        className={`grid gap-3`}
        style={{ 
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          maxHeight: `${maxHeight}px`,
          overflowY: 'auto'
        }}
      >
        {images.map((image, index) => {
          const isDeleting = deletingImages.has(image);
          
          return (
            <div
              key={`${image}-${index}`}
              className={`relative group aspect-square bg-gray-100 rounded-lg overflow-hidden transition-all duration-200 ${
                isDeleting ? 'opacity-50' : ''
              } ${
                editable ? 'cursor-move' : ''
              } ${
                draggedIndex === index ? 'opacity-60 ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
              draggable={editable}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Image - Use regular img for blob URLs, S3Image for everything else */}
              {image.startsWith('blob:') ? (
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onLoad={() => console.log('✅ Blob preview loaded:', image)}
                  onError={(e) => console.error('❌ Blob preview failed:', image, e)}
                  style={{ 
                    backgroundColor: '#f9fafb',
                    display: 'block',
                    position: 'relative',
                    zIndex: 1
                  }}
                />
              ) : (
                <img
                  src={(() => {
                    // If it's already a full URL, use it
                    if (image.startsWith('http')) {
                      return image;
                    }
                    
                    // If it's a relative path starting with /assets/ (old format), use placeholder
                    if (image.startsWith('/assets/') || image.startsWith('./assets/') || image.startsWith('../assets/')) {
                      return '/images/placeholder.svg';
                    }
                    
                    // If it's an S3 key (like products/filename), build full URL
                    if (image.includes('/') && !image.startsWith('/')) {
                      return `https://shopify-tn-images-dev.s3.eu-west-3.amazonaws.com/${image}`;
                    }
                    
                    // Fallback: assume it's in products folder
                    return `https://shopify-tn-images-dev.s3.eu-west-3.amazonaws.com/products/${image}`;
                  })()
                  }
                  alt={`Image ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onLoad={(e) => {
                    // Force visibility
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.visibility = 'visible';
                  }}
                  onError={(e) => {
                    console.error('❌ Image failed to load:', image);
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.border = '2px solid #ef4444';
                  }}
                  style={{ 
                    backgroundColor: '#f9fafb',
                    display: 'block',
                    position: 'relative',
                    zIndex: 1,
                    opacity: 1,
                    visibility: 'visible'
                  }}
                />
              )}

              {/* Overlay with actions */}
              {showActions && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200">
                  {/* Drag indicator - shows on hover */}
                  {editable && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-blue-500 bg-opacity-90 text-white text-xs px-3 py-1 rounded-full">
                        ↕️ Drag to reorder
                      </div>
                    </div>
                  )}
                  
                  {/* Remove Button - Always Visible */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full transition-all hover:bg-red-600 z-30 opacity-100 shadow-md"
                    disabled={isDeleting}
                    title="Remove image"
                  >
                    {isDeleting ? (
                      <div className="h-2 w-2 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <X className="h-2 w-2" />
                    )}
                  </button>

                  {/* Other action buttons - hidden by default, shown on hover */}
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex space-x-1">
                      {/* View */}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0 bg-white bg-opacity-90 hover:bg-opacity-100"
                        onClick={() => handleViewImage(image)}
                        title="View full size"
                      >
                        <ExternalLink className="h-2 w-2" />
                      </Button>

                      {/* Download */}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-6 w-6 p-0 bg-white bg-opacity-90 hover:bg-opacity-100"
                        onClick={() => handleDownloadImage(image)}
                        title="Download"
                      >
                        <Download className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>

                  {/* Move handles */}
                  {editable && images.length > 1 && (
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex space-x-1">
                        {index > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-6 px-2 text-xs bg-white bg-opacity-90"
                            onClick={() => handleMoveImage(index, index - 1)}
                            title="Move left"
                          >
                            ←
                          </Button>
                        )}
                        {index < images.length - 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-6 px-2 text-xs bg-white bg-opacity-90"
                            onClick={() => handleMoveImage(index, index + 1)}
                            title="Move right"
                          >
                            →
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Image index */}
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black bg-opacity-60 text-white text-xs px-1 py-0.5 rounded">
                      {index + 1}/{images.length}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk actions */}
      {editable && images.length > 1 && (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              console.log('🗑️ Starting bulk delete for', images.length, 'images');
              
              // Extract keys from images
              const keys = images.map(img => {
                if (img.startsWith('http')) {
                  const urlParts = img.split('/');
                  return urlParts.slice(-2).join('/'); // Get 'products/filename'
                }
                return img;
              }).filter(Boolean);
              
              console.log('🔑 Keys to delete:', keys);

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
                console.log('📥 Bulk delete response:', result);
                
                if (response.ok && result.deleted > 0) {
                  onImagesChange?.([]);
                  toast({
                    title: "Images supprimées",
                    description: `${result.deleted} image(s) supprimée(s) avec succès`,
                  });
                }
                
                if (result.failed > 0) {
                  toast({
                    title: "Certaines suppressions ont échoué",
                    description: `${result.failed} image(s) n'ont pas pu être supprimées`,
                    variant: "destructive",
                  });
                }
              } catch (error) {
                console.error('❌ Bulk delete error:', error);
                toast({
                  title: "Erreur de suppression",
                  description: "Impossible de supprimer les images",
                  variant: "destructive",
                });
              }
            }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All
          </Button>
        </div>
      )}
    </div>
  );
}
