import { useEffect, useState } from 'react';
import { isUploadedPhoto } from '../lib/productImages';
import PhotoPending from './PhotoPending';

export interface ProductImageProps {
  brand: string;
  model: string;
  storage?: string;
  imageUrl: string;
  /** Optional — selects the color-specific marketing photo from brand CDN. */
  color?: string;
  /** Optional — improves the synthetic fallback's category matching. */
  category?: string;
  alt?: string;
  /** Forces the synthetic fallback even when a real asset exists. */
  variant?: 'primary' | 'synthetic';
  /** Render hint: 'thumb' drops the wording and shows the logo alone. */
  context?: 'card' | 'hero' | 'thumb';
}

/**
 * ProductImage — the product's uploaded photo, or the LeHart "photo coming
 * soon" mark.
 *
 * There used to be four tiers: Apple's marketing CDN by model and colour,
 * then the demo catalogue's shared /assets pictures, then a drawn device,
 * then a category silhouette. All of them showed shoppers a picture that was
 * not the stock, and hid from staff which products still needed photos. Now
 * only a photo someone uploaded is shown (see isUploadedPhoto); everything
 * else gets the logo. brand/model/color/storage/category stay in the props so
 * call sites need not change.
 */
export function ProductImage({ imageUrl, alt, context }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imageUrl]);

  if (!failed && isUploadedPhoto(imageUrl)) {
    return (
      <img
        src={imageUrl}
        alt={alt ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  return <PhotoPending alt={alt} compact={context === 'thumb'} />;
}

export default ProductImage;
