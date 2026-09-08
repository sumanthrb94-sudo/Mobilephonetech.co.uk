import { GoogleGenAI } from '@google/genai';
import { enforceRateLimit } from '../_rateLimit.js';

/** A single prompt cannot be longer than this. */
const MAX_PROMPT = 2000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  /**
   * Rate limit first, before the key check and before any model call.
   *
   * This endpoint spends money on every request and took no argument for who
   * was calling or how often. Unmetered, it is two gifts to an attacker: a
   * bill run up one generateContent at a time, and a free Gemini proxy fronted
   * by our key. Neither needs an account — the route is public — so the cap is
   * per IP, tight, and applied to everyone.
   */
  if (!enforceRateLimit(req, res, 'gemini-chat', { limit: 10, windowMs: 60_000 })) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI service not configured' });
    return;
  }

  const prompt: unknown = req.body?.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }
  // A length cap as well as a rate cap: a long prompt costs more per call, so
  // ten enormous ones a minute is not the ceiling the rate limit implies.
  if (prompt.length > MAX_PROMPT) {
    res.status(400).json({ error: 'prompt is too long' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    res.status(200).json({ text: response.text ?? '' });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: 'AI service error' });
  }
}
