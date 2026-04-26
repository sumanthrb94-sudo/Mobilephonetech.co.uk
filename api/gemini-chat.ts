import { GoogleGenAI } from '@google/genai';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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
