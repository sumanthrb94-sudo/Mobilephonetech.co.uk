import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.VITE_SUPABASE_ANON_KEY ?? '',
);

const VALID_CONDITIONS = ['Pristine', 'Excellent', 'Good', 'Fair'] as const;
type Condition = (typeof VALID_CONDITIONS)[number];

// Valuations matrix: brand → model → condition → £ value
const VALUATIONS: Record<string, Record<string, Record<Condition, number>>> = {
  Apple: {
    'iPhone 17 Pro Max': { Pristine: 800, Excellent: 700, Good: 600, Fair: 450 },
    'iPhone 17 Pro':     { Pristine: 700, Excellent: 600, Good: 500, Fair: 380 },
    'iPhone 17':         { Pristine: 600, Excellent: 500, Good: 420, Fair: 320 },
    'iPhone 16 Pro Max': { Pristine: 650, Excellent: 560, Good: 480, Fair: 380 },
    'iPhone 16 Pro':     { Pristine: 580, Excellent: 500, Good: 420, Fair: 320 },
    'iPhone 16':         { Pristine: 480, Excellent: 400, Good: 340, Fair: 260 },
    'iPhone 15 Pro Max': { Pristine: 550, Excellent: 470, Good: 390, Fair: 300 },
    'iPhone 15 Pro':     { Pristine: 500, Excellent: 420, Good: 350, Fair: 270 },
    'iPhone 15':         { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 },
    'iPhone 14 Pro Max': { Pristine: 450, Excellent: 380, Good: 320, Fair: 250 },
    'iPhone 14 Pro':     { Pristine: 400, Excellent: 340, Good: 280, Fair: 220 },
    'iPhone 14':         { Pristine: 320, Excellent: 270, Good: 220, Fair: 170 },
    'iPhone 13':         { Pristine: 280, Excellent: 235, Good: 190, Fair: 150 },
    'iPhone 12':         { Pristine: 200, Excellent: 165, Good: 135, Fair: 105 },
  },
  Samsung: {
    'Galaxy S24 Ultra': { Pristine: 700, Excellent: 600, Good: 500, Fair: 380 },
    'Galaxy S24+':      { Pristine: 580, Excellent: 490, Good: 410, Fair: 310 },
    'Galaxy S24':       { Pristine: 480, Excellent: 400, Good: 330, Fair: 260 },
    'Galaxy S23 Ultra': { Pristine: 550, Excellent: 460, Good: 380, Fair: 290 },
    'Galaxy S23':       { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 },
  },
  Google: {
    'Pixel 9 Pro':  { Pristine: 560, Excellent: 470, Good: 390, Fair: 300 },
    'Pixel 9':      { Pristine: 450, Excellent: 380, Good: 310, Fair: 240 },
    'Pixel 8 Pro':  { Pristine: 480, Excellent: 400, Good: 330, Fair: 250 },
    'Pixel 8':      { Pristine: 380, Excellent: 320, Good: 260, Fair: 200 },
    'Pixel 7 Pro':  { Pristine: 350, Excellent: 290, Good: 240, Fair: 180 },
    'Pixel 7':      { Pristine: 300, Excellent: 250, Good: 200, Fair: 155 },
  },
};

function estimateValue(brand: string, model: string, condition: Condition): number | null {
  return VALUATIONS[brand]?.[model]?.[condition] ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { brand, model, condition, email, storage, issues } = req.body ?? {};

  // ── Validation ────────────────────────────────────────
  if (!brand || typeof brand !== 'string' || brand.trim().length === 0) {
    return res.status(400).json({ error: 'brand is required' });
  }
  if (!model || typeof model !== 'string' || model.trim().length === 0) {
    return res.status(400).json({ error: 'model is required' });
  }
  if (!condition || !VALID_CONDITIONS.includes(condition as Condition)) {
    return res.status(400).json({ error: `condition must be one of: ${VALID_CONDITIONS.join(', ')}` });
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  const estimatedValue = estimateValue(brand.trim(), model.trim(), condition as Condition);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('trade_in_quotes') as any).insert({
      email:            email.trim().toLowerCase(),
      device_brand:     brand.trim(),
      device_model:     model.trim(),
      device_storage:   storage?.trim() ?? null,
      device_condition: condition,
      issues:           Array.isArray(issues) ? issues : [],
      estimated_value:  estimatedValue,
      status:           'quoted',
    }).select('id, estimated_value, status').single();

    if (error) throw error;

    return res.status(201).json({
      id:             data.id,
      estimatedValue: data.estimated_value,
      status:         data.status,
      message:        estimatedValue
        ? `We'll pay £${estimatedValue} for your ${brand} ${model} in ${condition} condition.`
        : 'Your device has been logged. Our team will contact you with a personalised quote.',
    });
  } catch (err) {
    console.error('[api/trade-in]', err);
    return res.status(500).json({ error: 'Failed to submit trade-in quote' });
  }
}
