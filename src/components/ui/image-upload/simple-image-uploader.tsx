// src/components/ui/image-upload/simple-image-uploader.tsx
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Upload, X, Loader2 } from 'lucide-react';

interface SimpleImageUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  onUploadComplete?: (uploadedImages: any[]) => void;
  className?: string;
}

export default function SimpleImageUploader({
  onFilesSelected,
  onUploadComplete,
  className = ''
}: SimpleImageUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback((files: FileList) => {
    console.log('🎯 SimpleImageUploader - Files selected:', files.length);
    
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    
    // Create previews
    const newPreviews: string[] = [];
    fileArray.forEach((file, index) => {
      console.log(`📁 File ${index + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      try {
        const objectUrl = URL.createObjectURL(file);
        console.log(`🔗 Created Object URL for ${file.name}:`, objectUrl);
        newPreviews.push(objectUrl);
      } catch (error) {
        console.error(`❌ Failed to create Object URL for ${file.name}:`, error);
      }
    });
    
    setPreviews(newPreviews);
    onFilesSelected?.(fileArray);
  }, [onFilesSelected]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  }, [handleFileSelect]);

  const clearFiles = useCallback(() => {
    console.log('🧹 Clearing all files and previews');
    // Clean up object URLs
    previews.forEach(url => {
      try {
        URL.revokeObjectURL(url);
        console.log('🗑️ Cleaned up URL:', url);
      } catch (error) {
        console.error('❌ Error cleaning up URL:', url, error);
      }
    });
    
    setSelectedFiles([]);
    setPreviews([]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previews]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Upload files
  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Aucun fichier sélectionné",
        description: "Veuillez sélectionner des images à uploader",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    console.log('🚀 Starting upload for', selectedFiles.length, 'files');

    try {
      // Convert files to base64
      const imagesToUpload = await Promise.all(
        selectedFiles.map(async (file) => {
          console.log('📄 Converting to base64:', file.name);
          return {
            data: await fileToBase64(file),
            name: file.name,
          };
        })
      );

      console.log('📤 Uploading', imagesToUpload.length, 'images to /api/upload/images');

      // Upload to API
      const response = await fetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imagesToUpload,
          folder: 'products',
        }),
      });

      const result = await response.json();
      console.log('📥 Upload response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Process results
      const uploadedImages: any[] = [];
      let successCount = 0;
      let failCount = 0;
      
      result.results.forEach((res: any, index: number) => {
        if (res.success) {
          uploadedImages.push(res.data);
          successCount++;
          console.log(`✅ Upload success ${index + 1}:`, res.data.key);
        } else {
          failCount++;
          console.error(`❌ Upload failed ${index + 1}:`, res.error);
        }
      });

      if (successCount > 0) {
        toast({
          title: "Upload réussi !",
          description: `${successCount} image(s) uploadée(s) avec succès`,
        });
        
        onUploadComplete?.(uploadedImages);
        
        // Clear files after successful upload
        clearFiles();
      }

      if (failCount > 0) {
        toast({
          title: "Certains uploads ont échoué",
          description: `${failCount} image(s) n'ont pas pu être uploadées`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      toast({
        title: "Erreur d'upload",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, toast, onUploadComplete, clearFiles]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <div className="text-sm text-gray-600">
          <span className="font-medium">Cliquez pour sélectionner</span> ou glissez-déposez
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Images uniquement (JPEG, PNG, WEBP, GIF)
        </div>
      </div>

      {/* Debug Info */}
      {selectedFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="text-sm text-blue-800">
            📊 <strong>Debug Info:</strong> {selectedFiles.length} fichier(s) sélectionné(s), {previews.length} aperçu(s) créé(s)
          </div>
        </div>
      )}

      {/* Simple Previews */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <h4 className="text-sm font-medium text-gray-700 flex-shrink-0">
              Aperçus des images ({previews.length})
            </h4>
            
            <div className="flex gap-2">
              {/* Upload Button */}
              <Button
                type="button"
                onClick={uploadFiles}
                disabled={isUploading || selectedFiles.length === 0}
                size="default"
                className="px-4 py-2 text-sm font-medium whitespace-nowrap"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Upload en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length} Image{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              
              {/* Clear Button */}
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={clearFiles}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <X className="h-4 w-4 mr-1" />
                Effacer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {previews.map((previewUrl, index) => {
              const file = selectedFiles[index];
              return (
                <div key={index} className="space-y-2">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 relative">
                    <img
                      src={previewUrl}
                      alt={file?.name || `Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onLoad={(e) => {
                        // Image loaded successfully
                      }}
                      onError={(e) => {
                        console.error(`❌ Preview failed for image ${index + 1}:`, file?.name);
                        e.currentTarget.style.backgroundColor = '#fef2f2';
                        e.currentTarget.style.border = '2px solid #ef4444';
                        e.currentTarget.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; font-size: 12px; text-align: center; padding: 8px; color: #dc2626;">Preview Failed</div>';
                      }}
                      style={{ 
                        backgroundColor: '#f9fafb'
                      }}
                    />
                  </div>
                  
                  {/* File info */}
                  <div className="text-xs space-y-1">
                    <div className="text-gray-600 truncate" title={file?.name}>
                      {file?.name}
                    </div>
                    <div className="text-gray-500">
                      {file ? `${(file.size / 1024).toFixed(1)} KB • ${file.type.split('/')[1]?.toUpperCase()}` : 'Fichier inconnu'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
