import React from 'react'

export interface ProductImageProps {
  brand: string
  model: string
  storage?: string
  imageUrl: string
  alt?: string
}

export function ProductImage({ imageUrl, alt }: ProductImageProps) {
  return (
    <img
      src={imageUrl}
      alt={alt ?? ''}
      loading="lazy"
      decoding="async"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  )
}

export default ProductImage