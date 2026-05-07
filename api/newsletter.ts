import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.VITE_SUPABASE_ANON_KEY ?? '',
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name } = req.body ?? {};

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }
  const normalised = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalised)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (normalised.length > 254) {
    return res.status(400).json({ error: 'Email address too long' });
  }
  if (name && (typeof name !== 'string' || name.trim().length > 100)) {
    return res.status(400).json({ error: 'name must be a string under 100 characters' });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('newsletter_subscribers') as any)
      .upsert({ email: normalised, name: name?.trim() ?? null, is_active: true }, { onConflict: 'email' });

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('[api/newsletter]', err);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
