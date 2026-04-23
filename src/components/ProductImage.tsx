import React from 'react'
import { generateProductImageUrl } from '../utils'
import { fetchGeminiImage } from '../services/geminiFlash'

export interface ProductImageProps {
  brand: string
  model: string
  storage?: string
  imageUrl: string
  alt?: string
}

// Simple product image component - tries Gemini first, then generated fallback, then static imageUrl
export function ProductImage({ brand, model, storage, imageUrl, alt }: ProductImageProps) {
  const [src, setSrc] = React.useState<string>(imageUrl)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      // Try Gemini first
      try {
        const url = await fetchGeminiImage({ brand, model, storage })
        if (url && mounted) {
          setSrc(url)
          return
        }
      } catch {
        // ignore Gemini failure
      }
      // Fallback to generated SVG placeholder
      try {
        const generated = await generateProductImageUrl({ brand, model, storage })
        if (generated && mounted) {
          setSrc(generated)
        }
      } catch {
        // keep original imageUrl
      }
    }
    load()
    return () => { mounted = false }
  }, [brand, model, storage])

  return (
    <img
      src={src}
      alt={alt ?? model}
      loading="lazy"
      decoding="async"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  )
}

export default ProductImage
