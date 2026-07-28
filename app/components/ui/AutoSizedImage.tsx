'use client';

import React, { useState } from 'react';

interface AutoSizedImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export function AutoSizedImage({ src, alt = "Graphic", className = "" }: AutoSizedImageProps) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait' | null>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const handleLoad = (target: HTMLImageElement) => {
    const { naturalWidth, naturalHeight } = target;
    if (naturalHeight >= naturalWidth) {
      setOrientation('portrait');
    } else {
      setOrientation('landscape');
    }
  };

  React.useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      handleLoad(imgRef.current);
    }
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onLoad={(e) => handleLoad(e.currentTarget)}
      className={`
        object-contain bg-white rounded-lg p-2 border border-[var(--border)] h-auto
        ${orientation === 'portrait' ? 'w-[100%]' : 'w-full'}
        ${!orientation ? 'opacity-0' : 'opacity-100 transition-opacity duration-200'}
        ${className}
      `}
    />
  );
}
