// src/components/ui/image-upload/s3-image.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import s3EnhancedService from '@/lib/services/s3-enhanced.service';

interface S3ImageProps {
  src: string; // Can be S3 key, full URL, or blob URL
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export default function S3Image({
  src,
  alt,
  width,
  height,
  className = '',
  fallback = '/images/placeholder.svg',
  priority = false,
  fill = false,
  sizes,
  quality = 75,
  onLoad,
  onError,
}: S3ImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isBlob, setIsBlob] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!src) {
        setImageUrl(fallback);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setHasError(false);

        console.log('S3Image loading:', src);

        // Check if it's a blob URL (for previews)
        if (src.startsWith('blob:')) {
          console.log('Detected blob URL:', src);
          setImageUrl(src);
          setIsBlob(true);
          setIsLoading(false);
          return;
        }

        // Check if it's an old/invalid asset path - use fallback
        if (src.startsWith('/assets/') || src.startsWith('./assets/') || src.startsWith('../assets/')) {
          console.log('Detected old/invalid asset path, using fallback:', src);
          setImageUrl(fallback);
          setIsBlob(false);
          setIsLoading(false);
          return;
        }

        // Check if it's already a full HTTP/HTTPS URL
        if (src.startsWith('http://') || src.startsWith('https://')) {
          console.log('Detected full URL:', src);
          setImageUrl(src);
          setIsBlob(false);
          setIsLoading(false);
          return;
        }

        // Check if it's a relative path (like /images/...)
        if (src.startsWith('/') || src.startsWith('./') || src.startsWith('../')) {
          console.log('Detected relative path:', src);
          setImageUrl(src);
          setIsBlob(false);
          setIsLoading(false);
          return;
        }

        // Must be an S3 key, get the public URL
        if (s3EnhancedService.isS3Key(src)) {
          console.log('Detected S3 key:', src);
          const url = s3EnhancedService.getPublicUrl(src);
          console.log('Generated S3 URL:', url);
          setImageUrl(url);
          setIsBlob(false);
          // Fallback: show image after 2 seconds if onLoad doesn't fire
          setTimeout(() => {
            console.log('Timeout fallback: setting loading to false');
            setIsLoading(false);
          }, 2000);
        } else {
          console.log('Unknown format, using fallback for:', src);
          setImageUrl(fallback);
          setIsBlob(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading S3 image:', error);
        setImageUrl(fallback);
        setHasError(true);
        setIsLoading(false);
        onError?.(error instanceof Error ? error : new Error('Failed to load image'));
      }
    };

    loadImage();
  }, [src, fallback, onError]);

  const handleLoad = () => {
    try {
      console.log('Image loaded successfully:', imageUrl);
      setIsLoading(false);
      setHasError(false);
      onLoad?.();
    } catch (err) {
      console.error('Error in handleLoad:', err);
    }
  };

  const handleError = (e: any) => {
    console.error('Image failed to load:', imageUrl, e);
    setHasError(true);
    setIsLoading(false);
    
    // Don't set fallback immediately if it's the same as current URL (prevents infinite loop)
    if (imageUrl !== fallback) {
      console.log('Setting fallback image:', fallback);
      setImageUrl(fallback);
    }
    
    // Only call onError if it's not the fallback failing
    if (imageUrl !== fallback) {
      onError?.(new Error(`Image failed to load: ${imageUrl}`));
    }
  };

  console.log('S3Image render - imageUrl:', imageUrl, 'isLoading:', isLoading, 'hasError:', hasError);

  // Use regular img for blob URLs and relative paths
  if (isBlob || imageUrl.startsWith('/') || imageUrl.startsWith('./') || imageUrl.startsWith('../')) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        <img
          src={imageUrl}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-200',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
          style={fill ? { objectFit: 'cover', width: '100%', height: '100%' } : { width, height }}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}
      </div>
    );
  }

  // Use Next Image for external URLs (S3, etc.)
  if (fill) {
    return (
      <div className={cn('relative overflow-hidden', className)}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={alt}
            fill
            sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
            quality={quality}
            priority={priority}
            onLoad={() => {
              console.log('Next Image onLoad:', imageUrl);
              handleLoad();
            }}
            onError={(e) => {
              console.error('Next Image onError:', imageUrl, e);
              handleError(e);
            }}
            className="object-cover"
            style={{
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.2s'
            }}
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
            <div className="text-gray-400 text-sm">Loading...</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {imageUrl && width && height && (
        <Image
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes || `${width}px`}
          quality={quality}
          priority={priority}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-200',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}
      {isLoading && width && height && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
}
