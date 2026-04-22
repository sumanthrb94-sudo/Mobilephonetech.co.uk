import { useEffect, useState } from 'react'
import { fetchGeminiImage } from '../services/geminiFlash'

export interface ProductImageProps {
  brand: string
  model: string
  storage?: string
  imageUrl: string
  alt?: string
}

// Simple, consistent product image component with Gemini fallback
export function ProductImage({ brand, model, storage, imageUrl, alt }: ProductImageProps) {
  const [geminiUrl, setGeminiUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const url = await fetchGeminiImage({ brand, model, storage })
        if (url && mounted) setGeminiUrl(url)
      } catch {
        // ignore
      }
    }
    load()
    return () => { mounted = false }
  }, [brand, model, storage])

  // Prefer Gemini URL when available
  const src = geminiUrl ?? imageUrl
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
