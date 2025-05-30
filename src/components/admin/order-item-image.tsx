'use client'

import Image from "next/image";
import { useState } from "react";

interface OrderItemImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export default function OrderItemImage({ src, alt, width, height, className }: OrderItemImageProps) {
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = () => {
    setImageSrc('/images/placeholder.svg');
  };

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      onError={handleError}
    />
  );
}
