import React, { useState, useEffect } from 'react';
import { fetchImageBlob } from '../api/client';

export function ProtectedImage({ src, alt, className, fallback, ...props }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setObjectUrl(src);
      return;
    }

    let isMounted = true;
    let url = null;
    
    fetchImageBlob(src)
      .then(blob => {
        if (!isMounted) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(err => {
        console.error("Failed to load protected image:", src, err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [src]);

  if (error || !src) {
    if (fallback) return fallback;
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 text-sm ${className}`} {...props}>
        <span className="text-2xl mb-1">🖼️</span>
        {alt || "Image"}
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`animate-pulse bg-gray-200 ${className}`} {...props} />
    );
  }

  return (
    <img src={objectUrl} alt={alt} className={className} {...props} />
  );
}
