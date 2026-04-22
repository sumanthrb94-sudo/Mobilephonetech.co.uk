import { useEffect, useState } from 'react'
import { generateProductImageUrl } from './productImage'
import { fetchGeminiImage } from '../services/geminiFlash'

export interface ProductImageProps {
  brand: string
  model: string
  storage?: string
  imageUrl: string
  alt?: string
  galleryImages?: string[]
}

// Simple, consistent product image component with Gemini fallback
export function ProductImage({ brand, model, storage, imageUrl, alt, galleryImages }: ProductImageProps) {
  const [geminiUrl, setGeminiUrl] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      // Try Gemini first
      try {
        const url = await fetchGeminiImage({ brand, model, storage })
        if (url && mounted) setGeminiUrl(url)
      } catch {
        // ignore Gemini failure
      }
      // Fallback: generate a generic image to ensure a consistent image is shown
      if (mounted && !geminiUrl) {
        try {
          const generated = await generateProductImageUrl({ brand, model, storage })
          if (generated) setGeneratedUrl(generated)
        } catch {
          // ignore
        }
      }
    }
    load()
    return () => { mounted = false }
  }, [brand, model, storage, geminiUrl])

  // Prefer Gemini URL, then generated fallback, then provided imageUrl
  const src = geminiUrl ?? generatedUrl ?? imageUrl
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
