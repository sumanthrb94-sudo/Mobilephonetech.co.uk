// Gemini Flash image integration — routes through /api/gemini-image so the
// API key never reaches the client bundle.
export interface GeminiPayload {
  brand: string;
  model: string;
  storage?: string;
  usage?: string;
}

export async function fetchGeminiImage(payload: GeminiPayload): Promise<string | null> {
  const disable =
    (typeof window !== 'undefined' && (window as Window & { ENV?: { VITE_GEMINI_DISABLE?: string } }).ENV?.VITE_GEMINI_DISABLE) ||
    (import.meta.env as Record<string, string>).VITE_GEMINI_DISABLE === 'true';
  if (disable) return null;

  try {
    const res = await fetch('/api/gemini-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json() as { imageUrl?: unknown };
    return typeof data?.imageUrl === 'string' ? data.imageUrl : null;
  } catch {
    return null;
  }
}
