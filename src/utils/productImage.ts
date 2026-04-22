// Lightweight product image generator
// This file provides a simple, reliable image URL for a product if a real image
// is not available. It currently uses an on-the-fly SVG data URL, but the
// structure allows swapping in a Gemini-based generator later.

export interface ProductPreview {
  brand: string;
  model: string;
  storage?: string;
}

// Generate a simple inline SVG data URL with the product text.
// This is a safe, fast fallback intended for environments without network access.
export async function generateProductImageUrl(_p: ProductPreview): Promise<string> {
  const { brand, model, storage } = _p;
  const title = [brand, model].filter(Boolean).join(' ');
  const storageTxt = storage ? ` (${storage})` : '';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#ffffff" offset="0"/>
        <stop stop-color="#e5e7eb" offset="1"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="54%" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" fill="#374151">${title}${storageTxt}</text>
  </svg>`;
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return url;
}
