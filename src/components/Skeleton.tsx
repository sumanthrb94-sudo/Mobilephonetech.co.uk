import React from 'react';

/**
 * Skeleton primitives — content-shaped loading placeholders that share the
 * app's token system (grey-10 base, shimmer via grey-20) and radius scale.
 *
 * <Skeleton /> for a generic bar.
 * <ProductCardSkeleton /> / <ProductDetailSkeleton /> for page-specific shells.
 */

export function Skeleton({
  width,
  height,
  radius = 'var(--radius-md)',
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'block',
        width: typeof width === 'number' ? `${width}px` : width ?? '100%',
        height: typeof height === 'number' ? `${height}px` : height ?? '12px',
        borderRadius: radius,
        background:
          'linear-gradient(90deg, var(--grey-10) 0%, var(--grey-5) 50%, var(--grey-10) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.4s linear infinite',
        ...style,
      }}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div
      aria-hidden
      className="card"
      style={{ display: 'flex', flexDirection: 'column', cursor: 'default' }}
    >
      <div
        style={{
          aspectRatio: '1 / 1',
          background: 'var(--grey-5)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
        }}
      />
      <div style={{ padding: 'var(--spacing-20)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton width={60} height={10} />
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
        <div style={{ height: '8px' }} />
        <Skeleton width="45%" height={18} />
        <Skeleton height={40} radius="var(--radius-md)" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-busy
      aria-label="Loading products"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 'var(--spacing-20)',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div aria-busy aria-label="Loading product" style={{ padding: 'var(--spacing-48) 0' }}>
      <div className="container-bm" style={{ maxWidth: 'var(--container-max)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 'var(--spacing-32)',
          }}
          className="lg:grid-cols-2 lg:gap-16"
        >
          <Skeleton height={420} radius="var(--radius-xl)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton width={80} height={11} />
            <Skeleton width="70%" height={32} />
            <Skeleton width="40%" height={14} />
            <div style={{ height: '8px' }} />
            <Skeleton width="30%" height={32} />
            <Skeleton width="50%" height={14} />
            <div style={{ height: '16px' }} />
            <Skeleton height={56} radius="var(--radius-md)" />
            <Skeleton height={44} radius="var(--radius-md)" />
          </div>
        </div>
      </div>
    </div>
  );
}
