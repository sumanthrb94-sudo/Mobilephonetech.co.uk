import React from 'react';
import { resolveImageUrl, fallbackCategoryKey } from '../utils/productImagery';
import CategoryIllustration from './CategoryIllustration';

export interface ProductImageProps {
  brand: string;
  model: string;
  storage?: string;
  imageUrl: string;
  /** Optional — improves the synthetic fallback's category matching. */
  category?: string;
  alt?: string;
  /** Forces the synthetic Claude-designed fallback even when a real asset exists. */
  variant?: 'primary' | 'synthetic';
}

/**
 * ProductImage — renders a real product photo when one is available,
 * and otherwise falls back to the Claude-designed CategoryIllustration
 * keyed to the product's category. Never renders a broken <img>.
 */
export function ProductImage({ imageUrl, alt, category, model, variant }: ProductImageProps) {
  const resolved = variant === 'synthetic' ? null : resolveImageUrl(imageUrl);

  if (resolved) {
    return (
      <img
        src={resolved}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  // Fallback: Claude-designed category silhouette
  return (
    <div aria-label={alt} style={{ width: '100%', height: '100%' }}>
      <CategoryIllustration category={fallbackCategoryKey(category, model)} rounded={false} />
    </div>
  );
}

export default ProductImage;
