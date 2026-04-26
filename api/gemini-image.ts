// Proxy for Gemini image generation — keeps the API key server-side.
// Returns { imageUrl: null } until a real image-generation model is wired up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.status(200).json({ imageUrl: null });
}
