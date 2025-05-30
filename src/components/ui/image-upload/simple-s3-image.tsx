// src/components/ui/image-upload/simple-s3-image.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import s3EnhancedService from '@/lib/services/s3-enhanced.service';

interface SimpleS3ImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

export default function SimpleS3Image({
  src,
  alt,
  width,
  height,
  className = '',
  fill = false,
  sizes,
  priority = false,
}: SimpleS3ImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }

    // If it's already a full URL, use it directly
    if (src.startsWith('http://') || src.startsWith('https://')) {
      console.log('Using full URL directly:', src);
      setImageUrl(src);
      return;
    }

    // If it's a blob URL, use it directly
    if (src.startsWith('blob:')) {
      console.log('Using blob URL directly:', src);
      setImageUrl(src);
      return;
    }

    // If it's a relative path, use it directly
    if (src.startsWith('/')) {
      console.log('Using relative path directly:', src);
      setImageUrl(src);
      return;
    }

    // Treat as S3 key and generate URL
    try {
      if (s3EnhancedService.isS3Key(src)) {
        const url = s3EnhancedService.getPublicUrl(src);
        setImageUrl(url);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    }
  }, [src]);

  if (error || !imageUrl) {
    return (
      <div className={cn('bg-gray-200 flex items-center justify-center', className)}
           style={fill ? {} : { width, height }}>
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes || "(max-width: 768px) 100vw, 50vw"}
        priority={priority}
        className={cn('object-cover', className)}
        onError={() => {
          console.error('Image failed to load:', imageUrl);
          setError(true);
        }}
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width || 64}
      height={height || 64}
      sizes={sizes || `${width || 64}px`}
      priority={priority}
      className={cn('object-cover', className)}
      onError={() => {
        console.error('Image failed to load:', imageUrl);
        setError(true);
      }}
    />
  );
}
