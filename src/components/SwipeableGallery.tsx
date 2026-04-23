import React, { useRef, useState } from 'react';

/**
 * SwipeableGallery — wraps image children in a touch-swipeable track with
 * dot indicators. Keyboard: ←/→ steps through slides. A thin wrapper so
 * existing <ProductImage /> can be dropped in unchanged.
 */
export default function SwipeableGallery({
  images,
  renderSlide,
  height = 'clamp(260px, 50vw, 520px)',
}: {
  images: string[];
  renderSlide: (src: string, index: number, isActive: boolean) => React.ReactNode;
  height?: string;
}) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const clamp = (n: number) => Math.max(0, Math.min(n, images.length - 1));

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    deltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    deltaX.current = e.touches[0].clientX - startX.current;
  };
  const onTouchEnd = () => {
    if (startX.current === null) return;
    const threshold = 40;
    if (deltaX.current > threshold) setIndex((i) => clamp(i - 1));
    else if (deltaX.current < -threshold) setIndex((i) => clamp(i + 1));
    startX.current = null;
    deltaX.current = 0;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setIndex((i) => clamp(i + 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex((i) => clamp(i - 1)); }
  };

  if (images.length === 0) return null;

  return (
    <div
      ref={trackRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={`Product image ${index + 1} of ${images.length}`}
      onKeyDown={onKeyDown}
      style={{ position: 'relative', outline: 'none' }}
    >
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: '100%',
          height,
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--grey-5)',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: `${images.length * 100}%`,
            height: '100%',
            transform: `translateX(-${(100 / images.length) * index}%)`,
            transition: 'transform 0.35s cubic-bezier(0.2, 0, 0, 1)',
          }}
        >
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              style={{
                width: `${100 / images.length}%`,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(16px, 5vw, 48px)',
                boxSizing: 'border-box',
              }}
            >
              {renderSlide(src, i, i === index)}
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index}
              style={{
                width: i === index ? '20px' : '8px',
                height: '8px',
                borderRadius: 'var(--radius-full)',
                background: i === index ? 'var(--black)' : 'var(--grey-30)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
