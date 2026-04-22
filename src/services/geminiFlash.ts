// Gemini Flash image integration (client-side)
// Attempts to request a generated product image from Gemini's Flash Image service.
// If the service is unavailable or not configured, falls back to null so the
// consumer can use an existing imageUrl.
export interface GeminiPayload {
  brand: string;
  model: string;
  storage?: string;
  usage?: string; // optional hint about the usage scenario
}

//TOKEN is provided via VITE_GEMINI_API_KEY
export async function fetchGeminiImage(payload: GeminiPayload): Promise<string | null> {
  // Optional global toggle to disable Gemini during QA or in environments without access
  const disable = (typeof window !== 'undefined' && (window as any).ENV?.VITE_GEMINI_DISABLE) || (typeof import.meta !== 'undefined' && (import.meta.env && (import.meta.env as any).VITE_GEMINI_DISABLE) === 'true');
  if (disable) return null;
  try {
    const key = (import.meta && (import.meta as any).env && (import.meta as any).env.VITE_GEMINI_API_KEY) || '';
    if (!key) return null;
    const res = await fetch('https://gemini.flash/api/v1/flash-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({ brand: payload.brand, model: payload.model, storage: payload.storage, usage: payload.usage }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Expecting { imageUrl: 'https://...' }
    return typeof data?.imageUrl === 'string' ? data.imageUrl : null;
  } catch {
    return null;
  }
}
