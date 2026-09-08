// Proxy for Gemini image generation — keeps the API key server-side.
// Returns { imageUrl: null } until a real image-generation model is wired up.
import { enforceRateLimit } from '../_rateLimit.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  // A no-op today, but rate-limited now so that wiring it to a real
  // image model later cannot accidentally ship an unmetered spend endpoint.
  if (!enforceRateLimit(req, res, 'gemini-image', { limit: 10, windowMs: 60_000 })) return;
  res.status(200).json({ imageUrl: null });
}
