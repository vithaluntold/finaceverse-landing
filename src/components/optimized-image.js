import React, { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage - Lazy loading image with proper dimensions to prevent CLS
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  priority = false,
  placeholder = 'blur',
  sizes = '100vw',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Generate WebP source if original is not WebP
  const getWebPSrc = (originalSrc) => {
    if (!originalSrc || originalSrc.endsWith('.webp') || originalSrc.endsWith('.svg')) {
      return null;
    }
    return originalSrc.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  };

  const webpSrc = getWebPSrc(src);

  const containerStyle = {
    position: 'relative',
    width: width ? `${width}px` : 'auto',
    height: height ? `${height}px` : 'auto',
    overflow: 'hidden',
    ...style,
  };

  const imgStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 1 : 0,
  };

  const placeholderStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
    opacity: isLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease',
  };

  return (
    <div ref={imgRef} style={containerStyle} className={className}>
      {placeholder === 'blur' && <div style={placeholderStyle} aria-hidden="true" />}
      {isInView && (
        <picture>
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchpriority={priority ? 'high' : 'auto'}
            onLoad={() => setIsLoaded(true)}
            style={imgStyle}
            {...props}
          />
        </picture>
      )}
    </div>
  );
};

export default OptimizedImage;
