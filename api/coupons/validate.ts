// Coupon store — in production this would be a database table.
// Each entry: code, type (percentage|fixed), value, minOrder, maxUses, usesCount, expiresAt
interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
  description: string;
  active: boolean;
  expiresAt?: string; // ISO date string
}

const COUPONS: Record<string, Coupon> = {
  SAVE10: {
    code: 'SAVE10',
    discountType: 'percentage',
    value: 10,
    description: '10% off your order',
    active: true,
  },
  WELCOME20: {
    code: 'WELCOME20',
    discountType: 'fixed',
    value: 20,
    minOrderValue: 50,
    description: '£20 off orders over £50',
    active: true,
  },
  FREESHIP: {
    code: 'FREESHIP',
    discountType: 'fixed',
    value: 9.99,
    description: 'Free standard shipping',
    active: true,
  },
  REFURB15: {
    code: 'REFURB15',
    discountType: 'percentage',
    value: 15,
    minOrderValue: 200,
    description: '15% off refurbished phones over £200',
    active: true,
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, cartTotal } = req.body ?? {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' });
  }
  if (cartTotal === undefined || typeof cartTotal !== 'number' || cartTotal < 0) {
    return res.status(400).json({ error: 'cartTotal must be a non-negative number' });
  }

  const coupon = COUPONS[code.toUpperCase().trim()];

  if (!coupon) {
    return res.status(404).json({ error: 'Coupon code not found', valid: false });
  }
  if (!coupon.active) {
    return res.status(400).json({ error: 'This coupon is no longer active', valid: false });
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'This coupon has expired', valid: false });
  }
  if (coupon.minOrderValue && cartTotal < coupon.minOrderValue) {
    return res.status(400).json({
      error: `Minimum order of £${coupon.minOrderValue} required for this coupon`,
      valid: false,
      minOrderValue: coupon.minOrderValue,
    });
  }

  const discountAmount = coupon.discountType === 'percentage'
    ? Math.round((cartTotal * coupon.value) / 100 * 100) / 100
    : Math.min(coupon.value, cartTotal);

  return res.status(200).json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    discountAmount,
    description: coupon.description,
    newTotal: Math.max(0, Math.round((cartTotal - discountAmount) * 100) / 100),
  });
}
