'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ProductImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * ProductImage component with fallback and loading states
 * Handles image loading errors gracefully
 */
export default function ProductImage({
  src,
  alt,
  width = 200,
  height = 200,
  className = '',
  priority = false
}: ProductImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback placeholder image (simple colored background with text)
  const fallbackSrc = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='${width}' height='${height}' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3EImagem não disponível%3C/text%3E%3C/svg%3E`;

  const handleError = () => {
    console.warn(`Failed to load image: ${src}`);
    setImageError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Loading skeleton */}
      {isLoading && !imageError && (
        <div 
          className="bg-gray-200 animate-pulse rounded-lg"
          style={{ width: '100%', height: '100%', minWidth: width, minHeight: height }}
        />
      )}

      {/* Image */}
      <Image
        src={imageError ? fallbackSrc : src}
        alt={alt}
        width={width}
        height={height}
        className={`rounded-lg object-contain transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ width: '100%', height: '100%', maxWidth: `${width}px`, maxHeight: `${height}px` }}
        onError={handleError}
        onLoad={handleLoad}
        priority={priority}
        unoptimized // Allow external images without Next.js optimization
      />

      {/* Error state indicator */}
      {imageError && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-10">
          ⚠️
        </div>
      )}
    </div>
  );
}

